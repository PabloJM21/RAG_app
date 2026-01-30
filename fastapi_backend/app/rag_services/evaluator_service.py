import json
from typing import Any, Dict, List, Optional, Iterable
import re
from unittest.mock import inplace
import time
import numpy as np
import pandas as pd


#Orchestrators
from app.rag_apis.chat_api import ChatOrchestrator

# helpers for disc paths
from app.rag_services.helpers import get_doc_paths, get_log_path, get_doc_title, get_user_api_keys

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

        self.max_chunk_size = 100  # max chunk size in characters

        # these instructions aim at replacing the content of a big chunk like "embedding_chunk" by a summary of its own input_content created previously by extracting its sections titles.
        # input_level can also refer to a child of output_level instead, which can also be a summary created previously, thus defining enrichment in a recursive manner, for example with numbered sections.

    # ============================================================
    # INTERNAL HELPERS
    # ============================================================

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
            output_dict = json.loads(
                self.chat_orchestrator.call_with_history(label=self.model, system_prompt=system_prompt,
                                                         user_prompt=user_prompt, history=self.history))

            # update history list with user and assistant input of the new call
            self.history += [{"role": "user", "content": user_prompt},
                             {"role": "assistant", "content": output_dict["Output"]}]

        else:
            output_dict = json.loads(
                self.chat_orchestrator.call(label=self.model, system_prompt=system_prompt, user_prompt=user_prompt))

        return output_dict["Output"]






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

        output_chunks = output_chunks.copy()

        if self.current_level != self.target_level or not output_chunks:
            return None

        #
        await self.init_clients()

        if self.max_chunk_size:
            chunk_limit = self.max_chunk_size // 2
            input_chunk = input_chunk[:chunk_limit] + "... " + input_chunk[-chunk_limit:]

            output_chunk_limit = chunk_limit // len(output_chunks)
            first_chunk = output_chunks.pop(0)
            output_string = first_chunk[:output_chunk_limit] + "... " + first_chunk[-output_chunk_limit:]

            for output_chunk in output_chunks:
                new_string = output_chunk[:output_chunk_limit] + "... " + output_chunk[-output_chunk_limit:]
                output_string += f"\n\n---\n\n {new_string}"



        else:
            output_string = "\n\n---\n\n".join(output_chunks)




        system_prompt = self._get_system_prompt()
        self._compute_score(system_prompt, input_chunk, output_string)

        return None



    def commit_evaluation(self):

        if self.current_level != self.target_level:
            return None


        scores = [item["score"] for item in self.method_calls]
        self.pipeline_score = np.mean(scores)
        self.logger.log_step(task="header_2", layer=2, log_text=f"Pipeline Evaluation completed for target level {self.target_level} obtaining an average score of {self.pipeline_score}")

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
            input_chunk = input_chunk[:chunk_limit] + "... " + input_chunk[-chunk_limit:]
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
        self.logger.log_step(task="header_2", layer=2, log_text=f"Pipeline Evaluation completed for target level {self.target_level} obtaining an average score of {self.pipeline_score}")

        self.logger.log_step(task="table", layer=1, log_text=f"Individual Scores", table_data=self.method_calls)

        return None


