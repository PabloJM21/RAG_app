import json
from typing import Any, Dict, List, Optional, Iterable
import re
from unittest.mock import inplace
import time
import numpy as np
import pandas as pd
import copy

#Orchestrators
from app.rag_apis.chat_api import ChatOrchestrator

# helpers for disc paths
from app.rag_services.helpers import get_doc_paths, get_log_path, get_doc_title, get_user_api_keys, log_pipeline_methods

#loggs
from app.log_generator import InfoLogger
from app.generate_markdown import export_logs


# Database ops
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocPipelines, Paragraph, Retrieval


class BaseEvaluator:
    """
    ENRICHES ALREADY EXTRACTED/ENRICHED CONTENT FROM THE RETRIEVALS TABLES

    Takes hierarchy level (section, chapter) and generates enriched retrieval_input and retrieval_output for embedding or word-count retrievers.

    These enrichments can include a summary, hypothetical questions or keywords (include chat with history to remember past metadata)

    It is also possible to share retrieval_input or output among parents/children by using different input and output levels.

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, model: str, prompt: str, history: bool = False):

        self.db = db
        self.user_id = user_id
        self.doc_id = doc_id
        self.logger = logger

        self.prompt = prompt
        self.model = model

        self.chat_orchestrator: Optional[ChatOrchestrator] = None
        self.do_history = history
        self.history: list[dict[str, Any]] = []

        self.max_chunk_size = 5000  # max chunk size in characters

        # these instructions aim at replacing the content of a big chunk like "embedding_chunk" by a summary of its own input_content created previously by extracting its sections titles.
        # input_level can also refer to a child of output_level instead, which can also be a summary created previously, thus defining enrichment in a recursive manner, for example with numbered sections.

    # ============================================================
    # INTERNAL HELPERS
    # ============================================================
    @staticmethod
    def unwrap_output(chat_output):
        if isinstance(chat_output, dict):
            return chat_output["Score"]
        return chat_output

    def _get_system_prompt(self):

        # "title": "Summary",

        specific_prompt = f"""
            Score: {{
                            "title": "Score"
                            "description": {self.prompt},
                            "type": "integer"
                        }},
                        """

        system_prompt = f"""
                You are an assistant that must always respond in valid JSON following this schema:

                {{
                    "title": "Output",
                    "description": "Structured Output for a document chunk.",
                    "type": "object",
                    "properties": {{
                        {specific_prompt}
                    }}
                }}

                """

        return system_prompt



    async def init_clients(self):

        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1",
                                                db=self.db)

        self.chat_orchestrator = ChatOrchestrator(user_key_list=user_key_list,
                                                  base_api="https://chat-ai.academiccloud.de/v1")

    def _call_orchestrator(self, system_prompt, user_prompt):
        if self.do_history:
            chat_output = json.loads(
                self.chat_orchestrator.call_with_history(label=self.model, system_prompt=system_prompt,
                                                         user_prompt=user_prompt, history=self.history))

            #self.logger.log_step(task="info_text", log_text=f"For user_prompt\n {user_prompt} \nObtained this output_dict: {chat_output}")

            output_score = self.unwrap_output(chat_output)

            # update history list with user and assistant input of the new call
            self.history += [{"role": "user", "content": user_prompt}, {"role": "assistant", "content": str(output_score)}]

        else:
            chat_output = json.loads(self.chat_orchestrator.call(label=self.model, system_prompt=system_prompt, user_prompt=user_prompt))
            output_score = self.unwrap_output(chat_output)

        return output_score






class ChunkerEvaluator(BaseEvaluator):

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, model: str, prompt: str, target_level: str, history: bool = False):
        super().__init__(db=db, logger=logger, user_id=user_id, doc_id=doc_id, model=model, prompt=prompt, history=history)

        self.db = db
        self.user_id = user_id
        self.doc_id = doc_id
        self.logger = logger

        self.target_level = target_level
        self.current_level = ""

        
        self.method_calls = []
        self.pipeline_score = 0


    def _compute_score(self, system_prompt: str, input_chunk: str, output_chunks: str):
        # Qwen3-Coder is explicitly an instruction-tuned coder model, so its usage profile lines up with OpenAIs mini line

        # QWEN2.5_CODER_32B_INSTRUCT

        user_prompt = (
            "Please analyze the following INPUT_CHUNK and OUTPUT_CHUNKS, and generate the specified Output.\n\n"
            f"INPUT_CHUNK:\n---\n{input_chunk}\n---\n"
            f"OUTPUT_CHUNKS:\n---\n{output_chunks}"
        )

        score = self._call_orchestrator(system_prompt, user_prompt)

        self.method_calls.append({"input_chunk": input_chunk, "output_chunks": output_chunks, "score": int(score)})




    async def run_evaluation(self, input_chunk: str, output_chunks: list[str]):
        if not input_chunk:
            return None

        # avoid
        output_chunks = output_chunks.copy()
        #self.logger.log_step(task="info_text", layer=1,log_text=f"Comparing current level {self.current_level} with target level {self.target_level}")

        if self.current_level != self.target_level or not output_chunks:
            return None

        #self.logger.log_step(task="info_text", layer=1, log_text=f"Running evaluation for input_chunk:\n {input_chunk}\n and output_chunks:\n {output_chunks}")

        await self.init_clients()

        # Define input and output chunk limits
        input_chunk_limit = self.max_chunk_size // 2
        output_chunk_limit = input_chunk_limit // len(output_chunks)


        if input_chunk_limit < len(input_chunk)/2:
            input_chunk = input_chunk[:input_chunk_limit] + "... " + input_chunk[-input_chunk_limit:]

        avg_output_length = np.mean([len(chunk) for chunk in output_chunks])
        if output_chunk_limit < np.divide(avg_output_length, 2):
            first_chunk = output_chunks.pop(0)
            output_string = first_chunk[:output_chunk_limit] + "... " + first_chunk[-output_chunk_limit:]

            for output_chunk in output_chunks:
                if output_chunk:
                    new_string = output_chunk[:output_chunk_limit] + "... " + output_chunk[-output_chunk_limit:]
                    output_string += f"\n\n---\n\n {new_string}"

        else:
            output_string = "\n\n---\n\n".join(output_chunks)




        system_prompt = self._get_system_prompt()
        self._compute_score(system_prompt, input_chunk, output_string)

        return None



    def commit_evaluation(self):

        #if self.current_level != self.target_level:
            #return None


        scores = [item["score"] for item in self.method_calls]
        self.pipeline_score = np.mean(scores)
        self.logger.log_step(task="info_text", layer=2, log_text=f"Pipeline Evaluation completed for target level {self.target_level} obtaining an average score of {self.pipeline_score}")

        self.logger.log_step(task="table", layer=1, log_text=f"Individual Scores", table_data=self.method_calls)
        
        
        return None









class EnricherEvaluator(BaseEvaluator):

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, model: str, prompt: str,
                 target_level: str, history: bool = False):
        super().__init__(db=db, logger=logger, user_id=user_id, doc_id=doc_id, model=model, prompt=prompt,
                         history=history)

        self.db = db
        self.user_id = user_id
        self.doc_id = doc_id
        self.logger = logger

        self.target_level = target_level

        self.method_calls = []
        self.pipeline_score = 0



    def _compute_score(self, system_prompt: str, input_chunk: str, output_chunk: str):
        # Qwen3-Coder is explicitly an instruction-tuned coder model, so its usage profile lines up with OpenAIs mini line

        # QWEN2.5_CODER_32B_INSTRUCT



        user_prompt = (
            "Please analyze the following INPUT_CHUNK and OUTPUT_CHUNK, and generate the specified Output.\n\n"
            f"INPUT_CHUNK:\n---\n{input_chunk}\n---\n"
            f"OUTPUT_CHUNK:\n---\n{output_chunk}"
        )

        score = self._call_orchestrator(system_prompt, user_prompt)

        self.method_calls.append({"input_chunk": input_chunk, "output_chunk": output_chunk, "score": int(score)})





    async def run_evaluation(self, input_chunk: str, output_chunk: str):



        if self.max_chunk_size:
            chunk_limit = self.max_chunk_size // 2

            if input_chunk and chunk_limit < len(input_chunk) / 2:
                input_chunk = input_chunk[:chunk_limit] + "... " + input_chunk[-chunk_limit:]

            if output_chunk and chunk_limit < len(output_chunk) / 2:
                output_chunk = output_chunk[:chunk_limit] + "... " + output_chunk[-chunk_limit:]


        await self.init_clients()
        system_prompt = self._get_system_prompt()
        self._compute_score(system_prompt, input_chunk, output_chunk)

        return None





    async def commit_evaluation(self):
        rows, columns = await Retrieval.get_all(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.target_level}, db=self.db)
        retrieval_df = pd.DataFrame(rows, columns=columns).sort_values(by="level_id")
        
        for _, row in retrieval_df.iterrows():
            await self.run_evaluation(row["original_content"], row["content"])
        

        scores = [item["score"] for item in self.method_calls]
        self.pipeline_score = np.mean(scores)
        self.logger.log_step(task="info_text", layer=2, log_text=f"Pipeline Evaluation completed for target level {self.target_level} obtaining an average score of {self.pipeline_score}")

        self.logger.log_step(task="table", layer=1, log_text=f"Individual Scores", table_data=self.method_calls)

        return None







EVALUATOR_TYPE_MAPPER = {
    "Chunking": ChunkerEvaluator,
    "Enriching": EnricherEvaluator,
}

async def evaluation_wrapper(pipelines: dict[str, list[dict[str, Any]]], evaluator_args: dict, runner_args: dict,
                             session_logger, log_path, runner_fn):





    # Init evaluator method
    evaluator_array = pipelines.pop("evaluator", None)

    # Run Pipelines
    sorted_items = sorted(list(pipelines.items()), key=lambda x: int(x[0].strip()))
    #sorted_pipelines = [x[1] for x in sorted_items if x[1]]

    sorted_pipelines = []
    for x in sorted_items:
        if pipeline_not_empty(x[1]):
            sorted_pipelines.append(x[1])



    evaluation_pipelines = copy.deepcopy(sorted_pipelines)

    # If evaluator was instanced, run all pipelines and record their score. Finally run the highest scoring pipeline
    if evaluator_array:
        evaluator_method = evaluator_array[0]
        evaluator_method.pop("color", None)

        session_logger.log_step(task="header_2", layer=2, log_text=f"Starting Evaluation of Pipelines")
        session_logger.log_step(task="table", layer=2, log_text=f"Using following Method: ",
                                table_data=evaluator_method)

        evaluator_type = evaluator_method.pop("type")
        evaluator_method.update(**evaluator_args)
        evaluator_instance = EVALUATOR_TYPE_MAPPER[evaluator_type](**evaluator_method)

        pipeline_scores = []
        for i, pipeline in enumerate(evaluation_pipelines):
            # remove color key
            for pipeline_method in pipeline:
                pipeline_method.pop("color", None)

            session_logger.log_step(task="header_3", layer=2, log_text=f"Pipeline {i + 1}")
            log_pipeline_methods(session_logger, pipeline)

            pipeline_args = {**runner_args, "method_list": pipeline, "session_evaluator": evaluator_instance}

            await runner_fn(**pipeline_args)

            pipeline_scores.append(evaluator_instance.pipeline_score)

        #session_logger.log_step(task="info_text", layer=2, log_text=f"Do you copy?")

        #  Overwrite last Retrieval content with the best chunking pipeline
        best_index = pipeline_scores.index(max(pipeline_scores))
        best_pipeline = sorted_pipelines[best_index]

        session_logger.log_step(task="header_3", layer=2, log_text=f"Found best pipeline: Pipeline {best_index}")

        best_pipeline_args = {**runner_args, "method_list": best_pipeline, "session_evaluator": None}
        await runner_fn(**best_pipeline_args)



    # If there is no evaluator, run the first pipeline only
    else:
        pipeline = sorted_pipelines[0]
        session_logger.log_step(task="header_2", layer=2, log_text=f"Running Pipeline 1")
        log_pipeline_methods(session_logger, pipeline)

        first_pipeline_args = {**runner_args, "method_list": pipeline, "session_evaluator": None}
        await runner_fn(**first_pipeline_args)

    # Finally we export the logs to md
    await export_logs(log_path)












# Helpers




def pipeline_not_empty(input_list: list[dict[str, Any]]):
    for input_pipeline in input_list:
        for k, v in input_pipeline.items():
            if k == "where" and not v:
                return False
            elif k == "from" and not v:
                return False
            elif k == "to" and not v:
                return False

    return True