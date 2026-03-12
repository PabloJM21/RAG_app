import json
import asyncio
from typing import Any, Dict, List, Optional, Iterable
import re
from unittest.mock import inplace
import time
import numpy as np
import pandas as pd
import os
import copy

#Orchestrators
from app.rag_apis.chat_api import ChatOrchestrator

#Internal helpers 
from app.rag_services.evaluator_service import ChunkerEvaluator, EnricherEvaluator, evaluation_wrapper

# helpers for disc paths
from app.rag_services.helpers import get_doc_paths, get_log_path, get_doc_title, get_user_api_keys, log_pipeline_methods

#loggs
from app.log_generator import InfoLogger
from app.generate_markdown import export_logs


# Database ops
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocPipelines, Paragraph, Retrieval
from sqlalchemy import and_, update




class Extractor:
    """
    Extract the title (first # paragraph) of each level (section, chapter, document...) to the retrievals table as retrieval_input or retrieval_output:
    title:
    TEXT
    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, input_level: str, output_level: str, caption: str, what: str, position: str):
        # the caption - what introduces the content - is the equivalent of the instructions for the Enricher (for example generate a summary as "context" for children levels)

        self.db = db
        self.user_id = user_id

        self.input_level = input_level

        self.output_level = output_level

        self.caption = caption

        self.doc_id = doc_id

        self.title = False
        if what == "title":
            self.title = True

        self.position = position

        self.logger = logger

    @staticmethod
    def rows_to_columns(rows):

        if not rows:
            return {}
        cols = rows[0].keys()
        out = {c: [] for c in cols}
        for row in rows:
            for c in cols:
                out[c].append(row[c])

        return out

    @staticmethod
    def get_row_title(input_rows, level_id):
        for row in input_rows:
            if row["level_id"] == level_id:
                return row["title"]

        return None
    
    @staticmethod
    def get_row_content(input_rows, level_id):
        for row in input_rows:
            if row["level_id"] == level_id:
                return row["content"]
            
        return None

    @staticmethod
    def insert_row_content(input_rows, level_id, content):
        for row in input_rows:
            if row["level_id"] == level_id:
                row["content"] = content


    async def run_method(self) -> None:
        # use the content of input_level to generate metadata for output_level (e.g. section for section, or section for paragraph)
        # for example generate a section summary to enrich each section or provide context for all paragraphs in that section

        # loggs

        paragraphs_rows, paragraphs_columns = await Paragraph.get_all_paragraphs(columns=[f"{self.input_level}_id", f"{self.output_level}_id"], where_dict={"user_id": self.user_id, "doc_id": self.doc_id}, db=self.db)
        paragraphs_df = pd.DataFrame(paragraphs_rows, columns=paragraphs_columns)


        input_rows, input_columns = await Retrieval.get_all(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.input_level}, db=self.db)
        input_rows = [dict(row) for row in input_rows]

        input_df = pd.DataFrame(input_rows, columns=input_columns)  # like the retrievals table, but one for each hierarchy level
        input_ids = sorted(set(input_df["level_id"]))

        """
        input_df = pd.DataFrame(rows, columns=columns).sort_values(by="level_id")  # like the retrievals table, but one for each hierarchy level
        input_ids = sorted(set(input_df["level_id"]))
        
        rows, columns = await Retrieval.get_all(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.output_level}, db=self.db)
        output_df = pd.DataFrame(rows, columns=columns).sort_values(by="level_id")  like the retrievals table, but one for each hierarchy level
        """



        # PURPOSE: if input_level < output_level, we ensure that the titles of input_level_id_names get attached in order.
        if self.position == "top":
            input_ids.sort(reverse=True)

        update_data = []
        insert_data = []

        output_rows, _ = await Retrieval.get_all(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.output_level}, db=self.db)
        output_rows = [dict(row) for row in output_rows] #detach from ORM object

        await Retrieval.delete_data(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.output_level}, db=self.db)

        if self.position == "replace":
            for row in output_rows:
                row["content"] = ""

        for input_id in input_ids:


            if self.title:
                content = str(self.get_row_title(input_rows, input_id))
            else:
                content = str(self.get_row_content(input_rows, input_id))

            if self.caption:
                new_content = f"{self.caption}: {content}\n"
            else:
                new_content = f"{content}\n"


            raw_output_ids = []
            for row in paragraphs_rows:
                if row[f"{self.input_level}_id"] == input_id:
                    raw_output_ids.append(row[f"{self.output_level}_id"])

            output_ids = sorted(set(raw_output_ids))


            for output_id in output_ids:

                output_content = self.get_row_content(output_rows, output_id)


                old_content = str(output_content) if output_content else ""



                if old_content:

                    #if self.position in ["top", "bottom"]:

                    if self.position == "top": # title at the top
                        updated_content = f"{new_content}\n\n{old_content}"

                    else: #elif position in ["bottom", "replace"]

                        # content at the bottom of old content, or in case of replace, at the bottom of new content of previous iterations
                        updated_content = f"{old_content}\n\n{new_content}"

                    self.insert_row_content(output_rows, output_id, updated_content)

                    update_data.append({"Input": old_content, "Output": updated_content})



                else:

                    self.insert_row_content(output_rows, output_id, new_content)

                    insert_data.append({"Output": new_content})


        # After Completion
        for output_row in output_rows:
            await Retrieval.insert_data(data_dict=output_row, db=self.db)

        await self.db.commit()













class Enricher:
    """
    ENRICHES ALREADY EXTRACTED/ENRICHED CONTENT FROM THE RETRIEVALS TABLES

    Takes hierarchy level (section, chapter) and generates enriched retrieval_input and retrieval_output for embedding or word-count retrievers.

    These enrichments can include a summary, hypothetical questions or keywords (include chat with history to remember past metadata)

    It is also possible to share retrieval_input or output among parents/children by using different input and output levels.

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID,
                 where: str, model: str, prompt: str, position: str = "", caption: str = "", history: bool = False):

        self.db = db
        self.user_id = user_id
        self.doc_id = doc_id
        self.input_level = where
        self.logger = logger


        self.caption = caption
        self.prompt = prompt
        self.model = model
        self.position = position

        self.chat_orchestrator: Optional[ChatOrchestrator] = None
        self.do_history = history
        self.history: list[dict[str, Any]] = []


        # these instructions aim at replacing the content of a big chunk like "embedding_chunk" by a summary of its own input_content created previously by extracting its sections titles.
        # input_level can also refer to a child of output_level instead, which can also be a summary created previously, thus defining enrichment in a recursive manner, for example with numbered sections.




    # ============================================================
    # INTERNAL HELPERS
    # ============================================================

    @staticmethod
    def unwrap_answer(chat_output):
        # Not a dict → just stringify
        if not isinstance(chat_output, dict):
            return str(chat_output)

        # Case 1: direct Output string
        output = chat_output.get("Output")
        if isinstance(output, str):
            return output

        # Case 2: schema-style nested description
        props = chat_output.get("properties", {})
        if isinstance(props, dict):
            nested = props.get("Output", {})
            if isinstance(nested, dict):
                description = nested.get("description")
                if isinstance(description, str):
                    return description

        # Fallback
        return str(chat_output)

    async def init_clients(self):

        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1", db=self.db)

        self.chat_orchestrator = ChatOrchestrator(user_key_list=user_key_list,  base_api="https://chat-ai.academiccloud.de/v1")


    def _call_orchestrator(self, system_prompt, user_prompt):
        if self.do_history:
            chat_output = json.loads(self.chat_orchestrator.call_with_history(label=self.model, system_prompt=system_prompt, user_prompt=user_prompt, history=self.history))
            self.logger.log_step(task="info_text", log_text=f"Here is the chat output: {chat_output}")
            output_string = self.unwrap_answer(chat_output)

            # update history list with user and assistant input of the new call
            self.history += [{"role": "user", "content": user_prompt}, {"role": "assistant", "content": output_string}]

        else:
            chat_output = json.loads(self.chat_orchestrator.call(label=self.model, system_prompt=system_prompt, user_prompt=user_prompt))
            self.logger.log_step(task="info_text", log_text=f"Here is the chat output: {chat_output}")
            output_string = self.unwrap_answer(chat_output)

        return output_string


    def _enrich_chunk(self, chunk: str) -> str:
        # Qwen3-Coder is explicitly an instruction-tuned coder model, so its usage profile lines up with OpenAIs mini line

        specific_prompt = f"""Output: {{
                                    "title": "Output",
                                    "description": {self.prompt},
                                    "type": "string"
                                    }}"""

        system_prompt = f"""
                You are an assistant that must always respond in valid JSON following this schema:

                {{
                    "title": "Json",
                    "description": "Structured Json",
                    "type": "object",
                    "properties": {{
                        {specific_prompt}
                    }}
                }}

                """

        user_prompt = f"""
            Please analyze following Chunk Content and generate the specified Output. 

            Chunk Content:
            ---
            {chunk}

            """


        new_content = self._call_orchestrator(system_prompt, user_prompt)


        # Caption and Position Logic

        if self.caption:
            new_content = f"{self.caption}: \n{new_content}"

        if self.position == "top":
            output_content = f"{new_content}\n{chunk}"

        elif self.position == "bottom":
            output_content = f"{chunk}\n{new_content}"

        else:
            output_content = new_content


        return output_content




    async def run_method(self) -> None:
        # use the content of input_level to generate metadata for output_level (e.g. section for section, or section for paragraph)
        # for example generate a section summary to enrich each section or provide context for all paragraphs in that section

        # loggs
        await self.init_clients()


        rows, columns = await Retrieval.get_all(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.input_level}, db=self.db)



        input_df = pd.DataFrame(rows, columns=columns)  # like the retrievals table, but one for each hierarchy level

        input_ids = sorted(set(input_df[f"level_id"]))


        table_data = []
        for input_id in input_ids:
            #print(f"proceeding to enrich {input_id}")

            # instead of extracting chunk from paragraphs table, we search for the input or output column of the retrievals table

            old_content = input_df.loc[input_df["level_id"] == input_id, "content"].astype(str).iloc[0]  # one row dataframe

            if not old_content:

                return


            start = time.time()
            new_content = self._enrich_chunk(old_content)
            end = time.time()

            await Retrieval.update_data(data_dict={"content": new_content}, where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level_id": input_id, "level": self.input_level}, db=self.db)












class Filter:

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, where: str, model: str, prompt: str, history: bool = False):

        self.db = db
        self.user_id = user_id
        self.doc_id = doc_id
        self.input_level = where
        self.logger = logger

        self.prompt = prompt
        self.model = model

        self.chat_orchestrator: Optional[ChatOrchestrator] = None
        self.do_history = history
        self.history: list[dict[str, Any]] = []




    @staticmethod
    def extract_bool(s):
        try:
            x = json.loads(s.lower() if isinstance(s, str) else s)
            if isinstance(x, bool): return x
            if isinstance(x, dict): return next(v for v in x.values() if isinstance(v, bool))
        except:
            pass
        m = re.search(r'\btrue\b|\bfalse\b', str(s), re.I)
        if m: return m.group(0).lower() == "true"
        raise ValueError("No boolean found")




    async def init_clients(self):
        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1",
                                                db=self.db)

        self.chat_orchestrator = ChatOrchestrator(user_key_list=user_key_list,
                                                  base_api="https://chat-ai.academiccloud.de/v1")




    def _call_orchestrator(self, user_prompt, system_prompt):
        if self.do_history:

            chat_output = self.chat_orchestrator.call_with_history(label=self.model, system_prompt=system_prompt,
                                                         user_prompt=user_prompt, history=self.history)

            #self.logger.log_step(task="info_text", log_text=f"Unwrapping following answer: {chat_output}")
            output_bool = self.extract_bool(chat_output)

            # update history list with user and assistant input of the new call
            self.history += [{"role": "user", "content": user_prompt}, {"role": "assistant", "content": str(output_bool)}]

        else:
            chat_output = self.chat_orchestrator.call(label=self.model, system_prompt=system_prompt, user_prompt=user_prompt)
            #self.logger.log_step(task="info_text", log_text=f"Unwrapping following answer: {chat_output}")

            output_bool = self.extract_bool(chat_output)


        return output_bool




    def _decide_relevance(self, input_chunk):
        """
                Rewrites image content with paragraphs describing it - if it aligns with the main topic of the file. Otherwise, it removes it.
                Should remove descriptions of logos and layout symbols
        """

        system_prompt = f"""
                        You are an assistant that must always respond in valid JSON following this schema:

                        {{  
                            "title": "Json",
                            "description": "Structured Json",
                            "type": "object",
                            "properties": {{
                                "Boolean": {{
                                    "title": "Boolean",
                                    "description": {self.prompt},
                                    "type": "Boolean"
                                }}
                            }}  
                        }}   

                """

        user_prompt = f"""
                    Analyze the content of following CHUNK and generate the specified Boolean. 

                    CHUNK:
                    ---
                    {input_chunk}

                    """

        #self.logger.log_step(task="info_text", layer=1, log_text=f"Starting to filter following chunk: {input_chunk}")

        bool_output = self._call_orchestrator(user_prompt, system_prompt)

        return bool_output



    async def run_method(self) -> None:
        # use the content of input_level to generate metadata for output_level (e.g. section for section, or section for paragraph)
        # for example generate a section summary to enrich each section or provide context for all paragraphs in that section

        # loggs
        await self.init_clients()

        rows, columns = await Retrieval.get_all(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.input_level}, db=self.db)

        input_df = pd.DataFrame(rows, columns=columns)  # like the retrievals table, but one for each hierarchy level

        input_ids = sorted(set(input_df[f"level_id"]))

        for input_id in input_ids:
            # print(f"proceeding to enrich {input_id}")

            # instead of extracting chunk from paragraphs table, we search for the input or output column of the retrievals table

            content = input_df.loc[input_df["level_id"] == input_id, "content"].astype(str).iloc[0]  # one row dataframe

            is_relevant = self._decide_relevance(content)

            if not is_relevant:

                await Retrieval.delete_data(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level_id": input_id, "level": self.input_level}, db=self.db)

                self.logger.log_step(task="info_text", layer=1, log_text=f"Removed chunk:\n {content}\n")




class Reseter:


    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, where: str):

        self.db = db
        self.user_id = user_id
        self.doc_id = doc_id
        self.level = where
        self.logger = logger

    async def run_method(self):

        #self.logger.log_step(task="info_text", layer=2, log_text=f"Reseting chunks at {self.level} level")

        where_dict = {"user_id": self.user_id, "doc_id": self.doc_id, "level": self.level}

        # Filters
        filters = []
        for key, value in where_dict.items():
            filters.append(getattr(Retrieval, key) == value)

        stmt = (
            update(Retrieval)
            .where(and_(*filters))
            .values(content=Retrieval.original_content)
        )

        await self.db.execute(stmt)
        await self.db.commit()





# ---------------------------------------------

# ---------------- ORCHESTRATORS --------------------

# ---------------------------------------------


EVALUATOR_TYPE_MAPPER = {
    "Chunking": ChunkerEvaluator,
    "Enriching": EnricherEvaluator,
}




async def run_extraction_old(pipelines: dict[str, list[dict[str, Any]]], user_id: UUID, doc_id: UUID, db: AsyncSession):
    log_path = await get_log_path(user_id, stage="extraction")
    session_logger = InfoLogger(log_path=log_path, stage="extraction")
    doc_title = await get_doc_title(user_id, doc_id, db=db)
    session_logger.log_step(task="header_1", layer=2, log_text=f"Starting Extraction for document: {doc_title}")

    # Init evaluator method
    evaluator_array = []
    if "evaluator" in pipelines:
        evaluator_array = pipelines.pop("evaluator")

    # Run Pipelines
    sorted_items = sorted(list(pipelines.items()), key=lambda x: int(x[0].strip()))
    sorted_pipelines = [x[1] for x in sorted_items if x[1]]
    session_logger.log_step(task="info_text", log_text=f"Sorted pipelines look like this: {sorted_pipelines}")
    evaluation_pipelines = copy.deepcopy(sorted_pipelines)

    # If evaluator was instanced, run all pipelines and record their score. Finally run the highest scoring pipeline
    if evaluator_array:
        evaluator_method = evaluator_array[0]
        session_logger.log_step(task="header_2", layer=2, log_text=f"Starting Evaluation of Pipelines")
        session_logger.log_step(task="table", layer=2, log_text=f"using following Method: ", table_data=evaluator_method)

        evaluator_type = evaluator_method.pop("type")
        evaluator_method.update({"logger": session_logger, "user_id": user_id, "doc_id": doc_id, "db": db, "doc_title": doc_title})
        evaluator_instance = EVALUATOR_TYPE_MAPPER[evaluator_type](**evaluator_method)
        pipeline_scores = []
        for i, pipeline in enumerate(evaluation_pipelines):
            session_logger.log_step(task="info_text", layer=2, log_text=f"Pipeline {i + 1}")
            log_pipeline_methods(session_logger, pipeline)


            await run_extraction_pipeline(method_list=pipeline, user_id=user_id, doc_id=doc_id, db=db, session_logger=session_logger, session_evaluator=evaluator_instance, log_path=log_path)

            pipeline_scores.append(evaluator_instance.pipeline_score)

        #  Overwrite last Retrieval content with the best chunking pipeline
        best_index = pipeline_scores.index(max(pipeline_scores))
        best_pipeline = sorted_pipelines[best_index]

        session_logger.log_step(task="header_2", log_text=f"Found best pipeline: Pipeline {best_index}")

        await run_extraction_pipeline(method_list=best_pipeline, user_id=user_id, doc_id=doc_id, db=db, session_logger=session_logger, session_evaluator=evaluator_instance, log_path=log_path)



    # If no evaluator is present, run the first pipeline only
    else:

        pipeline = sorted_pipelines[0]
        session_logger.log_step(task="header_2", layer=2, log_text=f"Running Pipeline 1")
        log_pipeline_methods(session_logger, pipeline)

        await run_extraction_pipeline(method_list=pipeline, user_id=user_id, doc_id=doc_id, db=db, session_logger=session_logger, session_evaluator=None, log_path=log_path)


    # Finally we export the logs to md
    await export_logs(log_path)



# Run each Pipeline

EXTRACTION_TYPE_MAPPER = {
    "Extractor": Extractor,
    "Enricher": Enricher,
    "Filter": Filter,
    "Reset": Reseter,
}

async def run_extraction_pipeline(method_list: list[dict[str, Any]], user_id: UUID, doc_id: UUID, db: AsyncSession, session_logger: InfoLogger, session_evaluator: EnricherEvaluator):


    for method in method_list:

        method.pop("color", None)

        method.update({"logger": session_logger, "user_id": user_id, "doc_id": doc_id, "db": db})


        if method["type"] == "Extractor":
            input_level = method.pop("from")
            output_level = method.pop("to")
            method.update({"input_level": input_level, "output_level": output_level})
            method_type = method.pop("type")

            session_logger.log_step(task="header_3", layer=2, log_text=f"Starting Extractor from {input_level} to {output_level}")

        else:
            target_level = method["where"]
            method_type = method.pop("type")

            session_logger.log_step(task="header_3", layer=2, log_text=f"Starting {method_type} at {target_level} level")



        method_instance = EXTRACTION_TYPE_MAPPER[method_type](**method)

        method_start = time.time()
        await method_instance.run_method()
        method_end = time.time()

        session_logger.log_step(task="info_text", layer=2, log_text=f"Method finished after {round(method_end-method_start, 2)} seconds")

    #session_logger.log_step(task="info_text", layer=2, log_text=f"Session evaluator: {session_evaluator}")
    # After running the pipeline we perform the evaluation
    if session_evaluator:
        await session_evaluator.commit_evaluation()


async def run_extraction(pipelines: dict[str, list[dict[str, Any]]], user_id: UUID, doc_id: UUID, db: AsyncSession):
    log_path = await get_log_path(user_id, stage="extraction")
    session_logger = InfoLogger(log_path=log_path, stage="extraction")
    doc_title = await get_doc_title(user_id, doc_id, db=db)
    session_logger.log_step(task="header_1", layer=2, log_text=f"Starting Extraction for document: {doc_title}")

    evaluator_args = {"user_id": user_id, "doc_id": doc_id, "db": db, "logger": session_logger}
    runner_args = {"user_id": user_id, "doc_id": doc_id, "db": db, "session_logger": session_logger}

    await evaluation_wrapper(pipelines=pipelines, evaluator_args=evaluator_args, runner_args=runner_args,
                             session_logger=session_logger, log_path=log_path, runner_fn=run_extraction_pipeline)









