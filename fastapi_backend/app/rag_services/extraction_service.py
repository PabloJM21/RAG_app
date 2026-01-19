import json
import asyncio
from typing import Any, Dict, List, Optional, Iterable
import re
from unittest.mock import inplace
import time
import numpy as np
import pandas as pd
import os

#Orchestrators
from app.rag_apis.chat_api import ChatOrchestrator

# helpers for disc paths
from app.rag_services.helpers import get_doc_paths, get_log_paths, get_doc_name

#loggs
from app.log_generator import InfoLogger


# Database ops
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocPipelines, Paragraph, Retrieval





class Extractor:
    """
    Extract the title (first # paragraph) of each level (section, chapter, document...) to the retrievals table as retrieval_input or retrieval_output:
    title:
    TEXT
    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, input_level: str = "section", output_level: str = "document", caption: str = "A section title of this document", what: str = "content", replace: Optional[bool] = False):
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



        self.replace = replace
        self.logger = logger



    async def run_method(self) -> None:
        # use the content of input_level to generate metadata for output_level (e.g. section for section, or section for paragraph)
        # for example generate a section summary to enrich each section or provide context for all paragraphs in that section

        # loggs

        rows, columns = await Paragraph.get_all_paragraphs(where_dict={"user_id": self.user_id, "doc_id": self.doc_id}, db=self.db)
        paragraphs_df = pd.DataFrame(rows, columns=columns)

        rows, columns = await Retrieval.get_all(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.input_level}, db=self.db)
        input_df = pd.DataFrame(rows, columns=columns).sort_values(by="level_id")  # like the retrievals table, but one for each hierarchy level

        rows, columns = await Retrieval.get_all(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.output_level}, db=self.db)
        output_df = pd.DataFrame(rows, columns=columns).sort_values(by="level_id")  # like the retrievals table, but one for each hierarchy level

        input_ids = list(set(input_df[f"level_id"]))



        # PURPOSE: if input_level < output_level, we ensure that the titles of input_level_id_names get attached in order.
        # This is because the title_content gets attached on top of the old content, unlike in the enrichment case.
        if self.title:
            input_ids.sort(reverse=True)

        for input_id in input_ids:
            #print(f"proceeding to extract title {input_id}")

            if self.title:
                content = input_df.loc[input_df["level_id"] == input_id, "title"].dropna().astype(str).iloc[0]  # one row dataframe
            else:
                content = input_df.loc[input_df["level_id"] == input_id, "content"].dropna().astype(str).iloc[0]  # one row dataframe

            new_content = f"{self.caption}: {content}\n"



            # has only one element if input_ids-output_ids relationship is 1-to-1 or 1-to-* (e.g. paragraph-section, section-document)
            # otherwise it's a list (e.g. section-paragraph) and we have to iterate over all output_ids (paragraphs)

              # like the retrievals table, but one for each hierarchy level
            filtered_df = paragraphs_df[paragraphs_df[f"{self.input_level}_id"] == input_id]

            output_ids = list(set(filtered_df[f"{self.output_level}_id"]))

            for output_id in output_ids:



                # check if the content type (input or output) already exists
                old_content = output_df.loc[output_df["level_id"] == output_id, "title"].dropna().astype(str).iloc[0]  # one row dataframe

                if old_content:

                    if not self.replace:


                        if self.title: # title at the top
                            updated_content = f"{new_content}\n{old_content}"
                        else: # content at the bottom
                            updated_content = f"{old_content}\n{new_content}"


                        await Retrieval.update_data(data_dict={"content": updated_content}, where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level_id": output_id, "level": self.output_level}, db=self.db)

                        print(f"Updating doc_id, level_id, level: {self.doc_id, output_id, self.output_level}, with following content: {updated_content}")

                    else:
                        await Retrieval.update_data(data_dict={"content": new_content}, where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level_id": output_id, "level": self.output_level}, db=self.db)




                else:

                    await Retrieval.insert_data(data_dict={"doc_id": self.doc_id, "level_id": output_id, "level": self.output_level, "content": new_content}, db=self.db)

                    print(f"Inserting doc_id, level_id, level: {self.doc_id, output_id, self.output_level}, with following content: {new_content}")

        await self.db.commit()








class Enricher:
    """
    ENRICHES ALREADY EXTRACTED/ENRICHED CONTENT FROM THE RETRIEVALS TABLES

    Takes hierarchy level (section, chapter) and generates enriched retrieval_input and retrieval_output for embedding or word-count retrievers.

    These enrichments can include a summary, hypothetical questions or keywords (include chat with history to remember past metadata)

    It is also possible to share retrieval_input or output among parents/children by using different input and output levels.

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, where: str = "document", what: str = "summary", model: str = "coder",
                 replace: bool = True, caption: str = "Content"):

        self.db = db
        self.user_id = user_id
        self.doc_id = doc_id
        self.input_level = where
        self.logger = logger

        self.what = what
        self.caption = caption
        self.model = model
        self.replace = replace

        # these instructions aim at replacing the content of a big chunk like "embedding_chunk" by a summary of its own input_content created previously by extracting its sections titles.
        # input_level can also refer to a child of output_level instead, which can also be a summary created previously, thus defining enrichment in a recursive manner, for example with numbered sections.
















    # ============================================================
    # INTERNAL HELPERS
    # ============================================================


    def _get_system_prompt(self):

        specific_prompt = ""

        if self.what == "summary":
            specific_prompt += f"""
            {self.caption}: {{
                            "title": "Summary",
                            "description": "A concise 1-2 sentence summary of the chunk.",
                            "type": "string"
                        }},
                        """

        elif self.what == "keywords":
            specific_prompt += f"""
            {self.caption}: {{
                            "title": "Keywords",
                            "description": "A list of 5-7 key topics or entities mentioned.",
                            "type": "string"
                        }},
                        """

        elif self.what == "questions":
            specific_prompt += f"""
            {self.caption}: {{
                            "title": "Hypothetical Questions",
                            "description": "A list of 3-5 questions this chunk could answer.",
                            "type": "string"
                        }},
                        """

        system_prompt = f"""
                You are an assistant that must always respond in valid JSON following this schema:

                {{
                    "title": "ChunkTable",
                    "description": "Structured Table for a document chunk.",
                    "type": "object",
                    "properties": {{
                        {specific_prompt}
                    }}
                }}

                """

        return system_prompt



    def _enrich_chunk(self, system_prompt: str, chunk: str) -> str:
        # Qwen3-Coder is explicitly an instruction-tuned coder model, so its usage profile lines up with OpenAIs mini line

        # QWEN2.5_CODER_32B_INSTRUCT

        user_prompt = f"""
            Please analyze following Chunk Content and generate the specified Table. Use the same language as the chunk.

            Chunk Content:
            ---
            {chunk}

            """



        chat_orchestrator = ChatOrchestrator()

        output_dict = json.loads(chat_orchestrator.call("coder", system_prompt, user_prompt))

        print("printing Chat Output: ", output_dict)

        output = ""
        for k, v in output_dict.items():
            output += f"{k}: {v}"




        return output




    async def run_method(self) -> None:
        # use the content of input_level to generate metadata for output_level (e.g. section for section, or section for paragraph)
        # for example generate a section summary to enrich each section or provide context for all paragraphs in that section

        # loggs



        rows, columns = await Retrieval.get_all(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.input_level}, db=self.db)

        input_df = pd.DataFrame(rows, columns=columns).sort_values(by="level_id")  # like the retrievals table, but one for each hierarchy level

        input_ids = list(set(input_df[f"level_id"]))

        for input_id in input_ids:
            #print(f"proceeding to enrich {input_id}")

            # instead of extracting chunk from paragraphs table, we search for the input or output column of the retrievals table

            old_content = input_df.loc[input_df["level_id"] == input_id, "content"].dropna().astype(str).iloc[0]  # one row dataframe

            if not old_content:
                print("Content is empty")
                return

            system_prompt = self._get_system_prompt()

            start = time.time()
            new_content = self._enrich_chunk(system_prompt, old_content)
            end = time.time()

            # start logging
            self.logger.log_step(task="validate", log_text="enriched chunk", inputs=old_content, outputs=new_content, duration=f"{round(end - start, 2)} seconds")
            # end logging

            if not self.replace:

                updated_content = f"{old_content}\n{new_content}"

                
                await Retrieval.update_data(data_dict={"content": updated_content}, where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level_id": input_id, "level": self.input_level}, db=self.db)

                print(f"Updating doc_id, level_id, level: {self.doc_id, input_id, self.input_level}, with following content: {updated_content}")

            else:
                await Retrieval.update_data(data_dict={"content": new_content},
                                            where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level_id": input_id,
                                                        "level": self.input_level}, db=self.db)

class Reset:


    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, where: str = "section"):

        self.db = db
        self.user_id = user_id
        self.doc_id = doc_id
        self.level = where
        self.logger = logger

    async def run_method(self):

        # Finally, merge paragraphs data and insert chunks into the RETRIEVALS table (Sections and EmbeddingChunks)

        await Retrieval.delete_data({"user_id": self.user_id, "doc_id": self.doc_id, "level": self.level}, self.db)

        rows, columns = await Paragraph.get_all_paragraphs({"user_id": self.user_id, "doc_id": self.doc_id}, self.db)

        self.paragraph_df = pd.DataFrame(rows, columns=columns).sort_values(
            by="paragraph_id")  # ensures that paragraphs are in the right order

        # Insert Document title

        await self.export_document_title()

        # Export Level Chunks


        id_values = list(set(self.paragraph_df[f"{self.level}_id"]))

        for id_value in id_values:
            filtered_df = self.paragraph_df[self.paragraph_df[f"{self.level}_id"] == id_value]

            title = filtered_df["paragraph"].iloc[0]
            chunk = "\n".join(filtered_df["paragraph"].iloc[1:])

            # self.db.insert("Retrievals", {"doc_id": self.doc_id, "level": level, "level_id": id_value, "title": title, "content": chunk})

            await Retrieval.insert_data(
                {"user_id": self.user_id, "doc_id": self.doc_id, "level": self.level, "level_id": id_value,
                 "title": title, "content": chunk},
                self.db)

        await self.db.commit()





TYPE_MAPPER = {
    "Extractor": Extractor,
    "Enricher": Enricher,
    "Reset Content": Reset,
}

async def run_extraction(method_list: list[dict[str, Any]], user_id: UUID, doc_id: UUID, db: AsyncSession):

    log_path, log_md_path = await get_log_paths(user_id, stage="extraction")
    session_logger = InfoLogger(log_path=log_path, stage="extraction")

    # logg
    doc_name = await get_doc_name(user_id, doc_id, db=db)
    session_logger.log_step(task="header_1", log_text=f"Starting Extraction for document: {doc_name}")
    session_logger.log_step(task="table", log_text=f"Using following methods: ", table_data=method_list)


    for method in method_list:
        method.update({"logger": session_logger, "user_id": user_id, "doc_id": doc_id, "db": db})


        if method["type"] == "Extractor":
            method["input_level"] = method.pop("from")
            method["output_level"] = method.pop("to")
    
        method_type = method.pop("type")
        method_instance = TYPE_MAPPER[method_type](**method)
    
        await method_instance.run_method()









# Mybe implement in the future



class TableCleaner:
    """
    Filters out all items of the input_level that don't align with the content of their parent reference_level (should be something like a summary)
    Useful for images, tables, small sections ... representing irrelevant data that wasn't filtered before
    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id):

        self.db = db
        self.user_id = user_id


    def _filter_retrieval_ids(self, input_chunks: str, reference_chunk: str) -> List:
        # Qwen3-Coder is explicitly an instruction-tuned coder model, so its usage profile lines up with OpenAIs mini line

        # QWEN2.5_CODER_32B_INSTRUCT

        system_prompt = """
                You are an assistant that must always respond in valid JSON following this schema:

                {
                    "title": "Metadata",
                    "description": "Structured metadata",
                    "type": "object",
                    "properties": {
                        "input_ids": {
                            "title": "input_ids",
                            "description": "A list with each INPUT_ID whose content aligns with this CHUNK",
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    }
                }

        """

        user_prompt = f"""
            Please analyze the content of following CHUNK and INPUT_IDs, and generate the specified object. 

            CHUNK:
            ---
            {reference_chunk}
            ---
            {input_chunks}

            """

        chat_orchestrator = ChatOrchestrator()

        output_dict = json.loads(chat_orchestrator.call("thinker", system_prompt, user_prompt))

        print("printing Chat Output: ", output_dict)

        filtered_input_ids = list(output_dict["input_ids"])


        return filtered_input_ids



    def run_cleaning(self, input_level, reference_level):
        start = time.time()

        reference_df = pd.DataFrame(self.db.get_all("retrievals",f"level=?",[reference_level]))


        for _, row in reference_df.iterrows():
            reference_chunk = row["retrieval_input"]
            paragraphs_df = pd.DataFrame(self.db.get_all(row["doc_id"],f"{reference_level}_id=?", [row["level_id"]]))


            input_chunks = ""
            input_ids = list(set(paragraphs_df[f"{input_level}_id"].values))
            retrieval_ids = []
            for input_id in input_ids:
                input_df = pd.DataFrame(self.db.get_all("retrievals", f"level=? AND doc_id=? AND level_id=?", [input_level, row["doc_id"], input_id]))
                input_chunk = input_df["retrieval_input"].iloc[0]
                retrieval_id = input_df["retrieval_id"].iloc[0]
                retrieval_ids.append(retrieval_id)

                input_chunks += f"INPUT_ID={retrieval_id}\n{input_chunk}\n"

            filtered_retrieval_ids = self._filter_retrieval_ids(input_chunks, reference_chunk)

            for retrieval_id in retrieval_ids:
                if retrieval_id not in filtered_retrieval_ids:
                    self.db.delete("retrievals", f"retrieval_id=?", [retrieval_id])

        end = time.time()

        # logg
        self.logger.log_step(task="validate", log_text="Reasoner Retrieval", inputs=query, outputs=retrieval_output_ids, duration=f"{round(end-start, 2)} seconds")



