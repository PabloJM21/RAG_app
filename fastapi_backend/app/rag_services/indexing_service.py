import json
import asyncio
from typing import Any, Dict, List, Optional, Iterable
import re
import pandas as pd
import copy

import os
import time

# Orchestrators
from app.rag_apis.docling_api import DoclingClient, DoclingOutputType
from app.rag_apis.image2caption_api import MultiModalVisionClient
from app.rag_apis.chat_api import ChatOrchestrator

# External methods (Enrichers and Filters)
from app.rag_services.extraction_service import Enricher, Filter
from app.rag_services.evaluator_service import ChunkerEvaluator, EnricherEvaluator
# -----------------------------------------
# Docling
# -----------------------------------------

# Tokenizers and chunkers

from docling_core.transforms.chunker.hybrid_chunker import HybridChunker
from docling_core.transforms.chunker.tokenizer.base import BaseTokenizer
from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer
from torch.masked import argmax
from transformers import AutoTokenizer
from docling_core.transforms.chunker.base import BaseChunk
from docling_core.transforms.chunker.hierarchical_chunker import DocChunk, HierarchicalChunker

# Doc conversion

from docling.datamodel.base_models import InputFormat
from docling.document_converter import DocumentConverter

# from pdf path
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import PdfFormatOption




# -----------------------------------------
# Internal Helpers
# -----------------------------------------


# helpers for disc paths

from app.rag_services.helpers import get_doc_paths, get_log_path, get_doc_title, get_user_api_keys


#logs
from app.log_generator import InfoLogger
from app.generate_markdown import export_logs

# Database ops
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocPipelines, Paragraph, Retrieval



"""
    Currently  there are separated tables for each hierarchy level.
    Replace them with:
    A single paragraph table with marker columns (Chapter: 1 Section: 1, Chapter: 2 Section: 2, Chapter: 2 Section: 3)

    Extraction based on level and id (e.g. Chapter 2):
    output_df = pd.DataFrame(self.db.get_all(where level=id))   #where Section=3, where Subsection=4 ...
    paragraphs = output_df["content"]
    level_chunk = "\n".join([paragraphs.tolist()])


    A single metadata table (

"""
























class ImageConverter:

    def __init__(self, user_id: UUID, db: AsyncSession, logger: InfoLogger, prompt: str):
        self.user_id = user_id
        self.db = db
        self.logger = logger

        self.image_dict = {}
        self.image_id = 0
        self.prompt = prompt

        self.vision_client: Optional[MultiModalVisionClient] = None
        
        #new approach
        self.image_dict_b64 = {}


    async def init_clients(self):

        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1", db=self.db)

        self.vision_client = MultiModalVisionClient(user_key_list=user_key_list,  base_api="https://chat-ai.academiccloud.de/v1")


    

    def init_b64_image_dict(self, images):
        image_dict_b64 = {}

        for row in images:

            image_dict_b64[row['filename']] = row['image']

        self.image_dict_b64 = image_dict_b64



    async def process_b64_images(self, line):
        
        def replace_with_dict(match):
            key = match.group(0)  # the full matched string, e.g. "picture-1.png"
            image_caption = self.image_dict.get(key, "")  # fallback to "" if not found

            return image_caption

        if line.endswith(".png"):
            b64_image = re.sub(r"picture-\d+\.png", replace_with_dict, line)



            start = time.time()
            response = await self.vision_client.describe(b64_image, question=self.prompt, label="vision_only")
            end = time.time()

            pattern = r"\*\*Main Object:\*\*(.*?)\*\*Text Captions:\*\*"
            match = re.search(pattern, response, flags=re.DOTALL)
            if match:
                content = match.group(1).strip()
                self.logger.log_step(task="info_text", layer=1, log_text=f"Generated following Image Content in {round(end - start, 2)} seconds:\n\n {content}")

                return content

        return None



            
"""
       is_relevant = self.filter_image_content(content)
                if is_relevant:
                    start = time.time()
                    output_image_content = await self.rewrite_image_content(content)
                    end = time.time()

                    self.logger.log_step(task="table", log_text=f"Rewritten Image Content: ", table_data={"Duration": round(end - start, 2), "Input": content, "Output": output_image_content})

                    return f"{output_image_content}"
"""
            


class BaseConverter:

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, input_path: str, output_path: str):

        self.db = db
        self.logger = logger
        self.user_id = user_id
        self.doc_id = doc_id
        self.input_path = input_path
        self.output_path = output_path

        self.paragraph_df = pd.DataFrame()





class CustomConverter(BaseConverter):

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, input_path: str, output_path: str,
                 do_ocr: bool, image_starting_mark: str, image_ending_mark: str, prompt: str):
        super().__init__(db=db, logger=logger, user_id=user_id, doc_id=doc_id, input_path=input_path, output_path=output_path)

        # --- IMAGE LOGIC ---
        self.do_ocr = do_ocr
        self.image_starting_mark = image_starting_mark
        self.image_ending_mark = image_ending_mark


        # --------------------
        self.image_converter = ImageConverter(user_id=user_id, db=db, logger=self.logger, prompt=prompt)

        self.docling_client = ""


    async def init_clients(self):

        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1", db=self.db)

        self.docling_client = DoclingClient(user_key_list=user_key_list, base_api="https://chat-ai.academiccloud.de/v1")




    async def convert_file(self, input_path: str):

        #


        await self.init_clients()


        start = time.time()
        result = await self.docling_client.convert(
            file_path=input_path,
            response_type=DoclingOutputType.MARKDOWN,
            extract_tables_as_images=False,
        )

        end = time.time()

        md_text = result.get("markdown", "")
        images = result.get("images", [])


        self.logger.log_step(task="info_text", layer=1, log_text=f"Doc converted to Markdown in {end-start} seconds")




        # convert images or delete the references
        if self.do_ocr:
            start = time.time()
            await self.image_converter.init_clients()
            #await self.image_converter.init_image_dict(images)
            self.image_converter.init_b64_image_dict(images)
            end = time.time()

            self.logger.log_step(task="info_text", layer=1, log_text=f"Images converted to text in {round(end - start, 2)} seconds")

        else:
            before = len(md_text)
            md_text = re.sub(r"picture-\d+\.png", "", md_text)

            after = len(md_text)

            md_text = re.sub(r"\n{3,}", "\n\n", md_text)

            self.logger.log_step(task="info_text", layer=1, log_text=f"Removed images. {before} lines before, {after} lines now")

        lines = md_text.split("\n")
        # initialize the paragraph_dict. If no chunkers are provided it will only store paragraphs and record their section_id

        output_dict = {"text": ""}

        # create new tables for this document, if they don't exist

        # start processing paragraphs
        start = time.time()
        for i, line in enumerate(lines):

            #line = line.strip()
            #if not line:
                #continue

            # process images
            if self.do_ocr:
                line = await self.image_converter.process_b64_images(line) # self.image_converter.process_images(line)
                if not line:
                    continue
                line = f"{self.image_starting_mark}\n" + line + f"\n{self.image_ending_mark}"


            output_dict["text"] += f"{line}\n"


        end = time.time()

        self.logger.log_step(task="info_text", layer=2, log_text=f"Processed all lines and images in {round(end - start, 2)} seconds")


        return output_dict["text"]



    async def run_conversion(self) -> None:
        # First, check if there is any Doc_ID in the  "Docs" table that doesn't have a paragraphs table.
        # Then, run the docling client and process the markdown text



        self.logger.log_step(task="info_text", log_text="processing markdown")

        output_text = await self.convert_file(self.input_path)

        with open(self.output_path, "w", encoding="utf-8") as f:
            f.write(output_text)




class DoclingConverter(BaseConverter):
    """
    Base Docling Method for Hierarchical and Hybrid variants

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id, doc_id: UUID,
                 input_path: str, output_path: str, do_ocr=True, do_tables=True):

        super().__init__(db=db, logger=logger, user_id=user_id, doc_id=doc_id, input_path=input_path, output_path=output_path)

        self.do_ocr = do_ocr
        self.do_table_structure = do_tables
        # Force CPU


    def convert_file(self, input_path: str):

        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = self.do_ocr
        pipeline_options.do_table_structure = self.do_table_structure
        pipeline_options.table_structure_options.do_cell_matching = True

        doc_converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )

        start = time.time()
        dl_doc = doc_converter.convert(source=input_path).document
        output = dl_doc.export_to_markdown()
        end = time.time()

        self.logger.log_step(task="header_2", log_text=f"Doc converted to Markdown in {round(end - start, 2)} seconds")

        return output


    def run_conversion(self) -> None:
        # First, check if there is any Doc_ID in the  "Docs" table that doesn't have a paragraphs table.
        # Then, run the docling client and process the markdown text


        raw_text = self.convert_file(self.input_path)

        output_text = raw_text.replace("<!-- image -->", "") # remove possible image placeholders for valid markdown sections

        with open(self.output_path, "w", encoding="utf-8") as f:
            f.write(output_text)





# ---------------- Orchestrator --------------------


import inspect

async def maybe_await(value):
    if inspect.isawaitable(value):
        return await value
    return value



# Run Conversion

CONVERSION_TYPE_MAPPER = {
    "Docling": DoclingConverter,
    "Custom": CustomConverter,
}




async def run_conversion(converter_dict: Dict[str, Any], user_id: UUID, doc_id: UUID, db: AsyncSession):

    input_path, output_path = await get_doc_paths(user_id, doc_id, db=db)
    log_path = await get_log_path(user_id, stage="conversion")
    session_logger = InfoLogger(log_path=log_path, stage="conversion")

    # logg
    doc_title = await get_doc_title(user_id, doc_id, db=db)
    session_logger.log_step(task="header_1", layer=2, log_text=f"Starting conversion to Markdown for document: {doc_title}")
    session_logger.log_step(task="table", layer=2, log_text=f"Using following method: ", table_data=converter_dict)

    converter_dict.update({"db": db, "user_id": user_id, "doc_id": doc_id, "input_path": input_path, "output_path": output_path, "logger": session_logger})
    converter_type = converter_dict.pop("type")
    converter = CONVERSION_TYPE_MAPPER[converter_type](**converter_dict)

    await maybe_await(converter.run_conversion())

    # Finally we label this doc as "converted"
    await DocPipelines.update_data(data_dict={"converted": 1}, where_dict={"user_id": user_id, "doc_id": doc_id},
                          db=db)

    # And after that export the logs to md

    await export_logs(log_path)






# ---------------------------------------------

# ---------------- Markdown post-processing --------------------

# ---------------------------------------------



class ItemEnricher:
    """
    Enriches text items like tables, images, based on regex identifiers
    """

    def __init__(self, user_id: UUID, logger: InfoLogger, db: AsyncSession, prompt: str, model: str,
                 starting_mark: str = "|", ending_mark: str = "", history: bool = False):

        self.user_id = user_id
        self.db = db
        self.logger = logger

        self.item_lines = []  # stores all table positions
        self.current_chunk = ""  # stores paragraph from previous iterations
        self.starting_mark = starting_mark
        self.ending_mark = ending_mark

        self.prompt = prompt
        self.model = model
        self.chat_orchestrator: Optional[ChatOrchestrator] = None
        self.do_history = history
        self.history: list[dict[str, Any]] = []

    # ============================================================
    # INTERNAL HELPERS
    # ============================================================



    async def init_clients(self):
        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1",
                                                db=self.db)

        self.chat_orchestrator = ChatOrchestrator(user_key_list=user_key_list, base_api="https://chat-ai.academiccloud.de/v1")




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
                self.chat_orchestrator.call(label=self.model, system_prompt=system_prompt,
                                            user_prompt=user_prompt))

        return output_dict["Output"]

    def _enrich_chunk(self, chunk: str) -> str:
        # Qwen3-Coder is explicitly an instruction-tuned coder model, so its usage profile lines up with OpenAIs mini line

        system_prompt = f"""
                        You are an assistant that must always respond in valid JSON following this schema:

                        {{  
                            "title": "Json",
                            "description": "Structured Json",
                            "type": "object",
                            "properties": {{
                                "Output": {{
                                    "title": "Structured Output",
                                    "description": {self.prompt},
                                    "type": "string"
                                }}
                            }}  
                        }}   

                """

        user_prompt = f"""
                    Please analyze following Chunk Content and generate the specified Output. 

                    Chunk Content:
                    ---
                    {chunk}

                    """

        enriched_output = self._call_orchestrator(system_prompt, user_prompt)

        return enriched_output

    def scan_paragraphs(self, lines: List[str]):

        item_lines = set()

        in_table = False

        for i, line in enumerate(lines):
            stripped = line.strip()

            if not in_table:
                if stripped.startswith(self.starting_mark):
                    in_table = True
                    item_lines.add(i)
            else:
                if stripped == self.ending_mark:
                    in_table = False
                else:
                    item_lines.add(i)

        self.item_lines = item_lines




    def process_items(self, i, line, output_dict):

        if i in self.item_lines:
            # update actual paragraph for next iteration
            self.current_chunk += line
            return True

        if self.current_chunk:
            # process item into readable text
            explained_item = self._enrich_chunk(self.current_chunk)


            output_dict["text"] += f"{explained_item}\n"

            self.logger.log_step(task="table", layer=1, log_text=f"Explained new item: ", table_data={"Input": self.current_chunk, "Output": explained_item})

            self.current_chunk = ""

        return False





    def process_last_item(self, output_dict):
        if self.current_chunk:
            explained_item = self._enrich_chunk(self.current_chunk)

            output_dict["text"] += f"{explained_item}\n"

            self.logger.log_step(task="table", layer=1, log_text=f"Explained last item: ", table_data={"Input": self.current_chunk, "Output": explained_item})




    async def run_method(self, md_path: str):


        with open(md_path, "r", encoding="utf-8") as f:
            md_text = f.read()

        lines = md_text.split("\n")
        # search items, if the required chunker is provided

        start = time.time()
        await self.init_clients()

        self.scan_paragraphs(lines)
        end = time.time()

        self.logger.log_step(task="info_text", layer=1, log_text=f"Scanned items in {round(end - start, 2)} seconds")

        # initialize the paragraph_dict. If no chunkers are provided it will only store paragraphs and record their section_id

        output_dict = {"text": ""}

        # create new items for this document, if they don't exist

        # start processing paragraphs
        start = time.time()
        for i, line in enumerate(lines):

            line = line.strip()
            if not line:
                continue

            is_item = self.process_items(i, line, output_dict)
            if is_item:
                continue

            output_dict["text"] += f"{line}\n"

        # In case that the last paragraph still belongs to an item, save this item
        self.process_last_item(output_dict)

        end = time.time()

        self.logger.log_step(task="info_text", layer=2, log_text=f"Processed items in {round(end - start, 2)} seconds")

        output_text = output_dict["text"]

        with open(md_path, "w", encoding="utf-8") as f:
            f.write(output_text)







class ItemFilter:

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, prompt: str, model: str,
                 starting_mark: str = "|", ending_mark: str = "", remove_mark: bool = True, history: bool = False):

        self.user_id = user_id
        self.db = db
        self.logger = logger


        self.item_lines = []  # stores all table positions
        self.current_chunk = ""  # stores paragraph from previous iterations
        self.starting_mark = starting_mark
        self.ending_mark = ending_mark
        self.remove_mark = remove_mark

        self.prompt = prompt
        self.model = model
        self.chat_orchestrator: Optional[ChatOrchestrator] = None
        self.do_history = history
        self.history: list[dict[str, Any]] = []
        self.system_prompt = self._get_system_prompt()








    async def init_clients(self):
        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1",
                                                db=self.db)

        self.chat_orchestrator = ChatOrchestrator(user_key_list=user_key_list,
                                                  base_api="https://chat-ai.academiccloud.de/v1")

    def _call_orchestrator(self, user_prompt, system_prompt):
        if self.do_history:
            output_dict = json.loads(
                self.chat_orchestrator.call_with_history(label=self.model, system_prompt=system_prompt,
                                                         user_prompt=user_prompt, history=self.history))

            # update history list with user and assistant input of the new call
            self.history += [{"role": "user", "content": user_prompt},
                             {"role": "assistant", "content": output_dict["Boolean"]}]

        else:
            output_dict = json.loads(
                self.chat_orchestrator.call(label=self.model, system_prompt=system_prompt,
                                            user_prompt=user_prompt))

        return output_dict["Boolean"]




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

        bool_output = self._call_orchestrator(user_prompt, system_prompt)

        return bool_output

    def scan_paragraphs(self, lines: List[str]):

        item_lines = set()

        in_table = False

        for i, line in enumerate(lines):
            stripped = line.strip()

            if not in_table:
                if stripped.startswith(self.starting_mark):
                    in_table = True
                    item_lines.add(i)
            else:
                if stripped == self.ending_mark:
                    in_table = False
                else:
                    item_lines.add(i)

        self.item_lines = item_lines



    def process_items(self, i, line, output_dict):

        if i in self.item_lines:
            # update actual paragraph for next iteration
            self.current_chunk += line
            return True

        if self.current_chunk:

            is_relevant = self._decide_relevance(self.current_chunk)

            if is_relevant:
                current_chunk = self.current_chunk
                if self.remove_mark:
                    # from the left
                    current_chunk = current_chunk.replace(self.starting_mark, "", 1)
                    # from the right
                    parts = current_chunk.rsplit(self.ending_mark, 1)
                    current_chunk = parts[0] + parts[1]

                output_dict["text"] += f"{current_chunk}\n"

                self.logger.log_step(task="info_text", layer=1, log_text=f"Saved item:\n {current_chunk}\n")

            else:
                self.logger.log_step(task="info_text", layer=1, log_text=f"Removed item:\n {self.current_chunk}\n")


            self.current_chunk = ""

        return False




    def process_last_item(self, output_dict):
        if self.current_chunk:
            is_relevant = self._decide_relevance(self.current_chunk)

            if is_relevant:
                current_chunk = self.current_chunk
                if self.remove_mark:
                    # from the left
                    current_chunk = current_chunk.replace(self.starting_mark, "", 1)
                    # from the right
                    parts = current_chunk.rsplit(self.ending_mark, 1)
                    current_chunk = parts[0] + parts[1]

                output_dict["text"] += f"{current_chunk}\n"

                self.logger.log_step(task="info_text", layer=1, log_text=f"Saved last item:\n {current_chunk}\n")

            else:
                self.logger.log_step(task="info_text", layer=1, log_text=f"Removed last item:\n {self.current_chunk}\n")






    async def run_method(self, md_path: str):


        with open(md_path, "r", encoding="utf-8") as f:
            md_text = f.read()

        lines = md_text.split("\n")
        # search items, if the required chunker is provided

        start = time.time()
        await self.init_clients()

        self.scan_paragraphs(lines)
        end = time.time()

        self.logger.log_step(task="info_text", layer=1, log_text=f"Scanned items in {round(end - start, 2)} seconds")

        # initialize the paragraph_dict. If no chunkers are provided it will only store paragraphs and record their section_id

        output_dict = {"text": ""}

        # create new items for this document, if they don't exist

        # start processing paragraphs
        start = time.time()
        for i, line in enumerate(lines):

            line = line.strip()
            if not line:
                continue

            is_item = self.process_items(i, line, output_dict)
            if is_item:
                continue

            output_dict["text"] += f"{line}\n"

        # In case that the last paragraph still belongs to an item, save this item
        self.process_last_item(output_dict)

        end = time.time()

        self.logger.log_step(task="info_text", layer=2, log_text=f"Processed items in {round(end - start, 2)} seconds")

        output_text = output_dict["text"]

        with open(md_path, "w", encoding="utf-8") as f:
            f.write(output_text)



def log_pipeline_methods(logger: InfoLogger, input_pipeline: list[dict[str, Any]]):
    logger.log_step(task="info_text", layer=2, log_text=f"This Pipeline consists of following methods: ",
                            table_data=input_pipeline)
    for input_method in input_pipeline:
        logger.log_step(task="table", layer=2, table_data=input_method)



PROCESSING_TYPE_MAPPER = {
    "Rewriter": ItemEnricher,
    "Filter": ItemFilter,
}




async def run_md_processing(pipeline: list[dict[str, Any]], user_id: UUID, doc_id: UUID, db: AsyncSession):

    _, md_path = await get_doc_paths(user_id, doc_id, db=db)
    log_path = await get_log_path(user_id, stage="md_processing")
    session_logger = InfoLogger(log_path=log_path, stage="md_processing")
    doc_title = await get_doc_title(user_id, doc_id, db=db)


    session_logger.log_step(task="header_1", log_text=f"Starting Markdown Processing for document: {doc_title}")
    session_logger.log_step(task="header_2", log_text=f"Running Pipeline")
    log_pipeline_methods(session_logger, pipeline)


    for method in pipeline:
        method.update({"logger": session_logger, "user_id": user_id, "db": db})


        method_type = method.pop("type")
        method_instance = PROCESSING_TYPE_MAPPER[method_type](**method)

        await method_instance.run_method(md_path)

    await export_logs(log_path)







# ---------------------------------------------

# ----------------CHUNKERS --------------------

# ---------------------------------------------
# Requirement for new Chunker classes: "chunk_text" method with the specified input and output data types.

class BaseChunker:
    
    def __init__(self, db: AsyncSession, logger: InfoLogger, evaluator: ChunkerEvaluator, user_id: UUID, doc_id: UUID, level_name: str, doc_title: str, with_title: bool):


        self.db = db
        self.logger = logger
        self.evaluator = evaluator
        self.user_id = user_id
        self.doc_id = doc_id
        self.doc_title = doc_title

        self.level = level_name # name of the new level to be created
        self.level_id = 1
        self.with_title = with_title

        self.paragraph_df = pd.DataFrame()


    def get_tokenizer_tools(self, model: str, max_tokens: int = 512):



        hf_tok = AutoTokenizer.from_pretrained(model)


        if not max_tokens:
            max_tokens = hf_tok.model_max_length
            self.logger.log_step(task="info_text", layer=1, log_text=f"Setting max_tokens={max_tokens} corresponding to {model}")

        else:
            self.logger.log_step(task="info_text", layer=1, log_text=f"Keeping max_tokens={max_tokens}")



        token_limit = 2000  # prevent too big embeddings given by wrong max_tokens

        if max_tokens > token_limit:

            self.logger.log_step(task="info_text", layer=1, log_text=f"Tokens too big. Setting max_tokens={token_limit}")

            max_tokens = token_limit
        
        tokenizer: BaseTokenizer = HuggingFaceTokenizer(tokenizer=hf_tok, max_tokens=max_tokens)



        return tokenizer, int(max_tokens)
    

        

    async def run_doc_chunking(self, input_path: str):

        # loggs
        self.logger.log_step(task="info_text", layer=1, log_text=f"Starting Doc chunking")
        # -----


        await Retrieval.insert_data( data_dict={"level": "document", "level_id": 1, "user_id": self.user_id,
                                            "doc_id": self.doc_id, "title": self.doc_title}, db=self.db)

        with open(input_path, "r", encoding="utf-8") as f:
            md_text = f.read()


        # This dict will contain all metadata for the final insert in the "Paragraphs" table
        meta_dict = {"paragraph": md_text, "user_id": self.user_id, "doc_id": self.doc_id, "document_id": 1}

        # call chunk_text method normally,
        meta_list = await self.run_text_chunking(meta_dict)

        return meta_list

    async def run_text_chunking(self, meta_dict: Dict[str, Any])-> List[Dict[str, Any]]:

        input_chunk = meta_dict.pop("paragraph")
        # now meta_dict holds only the parent level IDs

        # method of the child class

        output_chunks = self.chunk_text(input_chunk)



        # Evaluate Chunking
        if self.evaluator:
            self.evaluator.run_evaluation(input_chunk=input_chunk, output_chunks=output_chunks)




        # each item will correspond to a chunk, its level_id plus meta_dict
        meta_list = []
        for chunk in output_chunks:
            raw_chunk = chunk

            title = ""
            if self.with_title:

                title, chunk = (chunk.split("\n", 1) + [""])[:2]


            if title or chunk:
                await Retrieval.insert_data(data_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.level, "level_id": self.level_id, "title": title, "content": chunk, "original_content": chunk}, db=self.db)

                meta_list.append(meta_dict | {"paragraph": raw_chunk, f"{self.level}_id": self.level_id})

            self.level_id += 1

        await self.db.commit()

        return meta_list




class ChunkingEnricher:

    """
    The only difference to the regular Enricher is that the enriched content updates "content" but also "original_content"

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID,
                 where: str, model: str, prompt: str, position: str = "", caption: str = "", history: bool = False):

        self.db = db
        self.user_id = user_id
        self.doc_id = doc_id
        self.level = where
        self.logger = logger


        self.caption = caption
        self.prompt = prompt
        self.model = model
        self.position = position

        self.chat_orchestrator: Optional[ChatOrchestrator] = None
        self.do_history = history
        self.history: list[dict[str, Any]] = []


        # these instructions aim at replacing the content of a big chunk like "embedding_chunk" by a summary of its own input_content created previously by extracting its sections titles.
        # level can also refer to a child of output_level instead, which can also be a summary created previously, thus defining enrichment in a recursive manner, for example with numbered sections.




    # ============================================================
    # INTERNAL HELPERS
    # ============================================================


    def _get_system_prompt(self):

        # "title": "Summary",


        specific_prompt = f"""Output: {{
                                    "title": "Structured Output",
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

        return system_prompt


    async def init_clients(self):

        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1", db=self.db)

        self.chat_orchestrator = ChatOrchestrator(user_key_list=user_key_list,  base_api="https://chat-ai.academiccloud.de/v1")


    def _call_orchestrator(self, system_prompt, user_prompt):
        if self.do_history:
            output_dict = json.loads(self.chat_orchestrator.call_with_history(label=self.model, system_prompt=system_prompt, user_prompt=user_prompt, history=self.history))

            # update history list with user and assistant input of the new call
            self.history += [{"role": "user", "content": user_prompt}, {"role": "assistant", "content": output_dict["Output"]}]

        else:
            output_dict = json.loads(self.chat_orchestrator.call(label=self.model, system_prompt=system_prompt, user_prompt=user_prompt))

        return output_dict["Output"]


    def _enrich_chunk(self, system_prompt: str, chunk: str) -> str:
        # Qwen3-Coder is explicitly an instruction-tuned coder model, so its usage profile lines up with OpenAIs mini line

        # QWEN2.5_CODER_32B_INSTRUCT

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




    async def run_method(self, chunk_array) -> None:
        # use the content of level to generate metadata for output_level (e.g. section for section, or section for paragraph)
        # for example generate a section summary to enrich each section or provide context for all paragraphs in that section

        # loggs
        await self.init_clients()


        rows, columns = await Retrieval.get_all(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.level}, db=self.db)

        self.logger.log_step(task="info_text", log_text="Starting enriching chunks")

        input_df = pd.DataFrame(rows, columns=columns).sort_values(by="level_id")  # like the retrievals table, but one for each hierarchy level

        input_ids = list(set(input_df[f"level_id"]))



        for input_id in input_ids:
            #print(f"proceeding to enrich {input_id}")

            # instead of extracting chunk from paragraphs table, we search for the input or output column of the retrievals table

            old_content = input_df.loc[input_df["level_id"] == input_id, "content"].dropna().astype(str).iloc[0]  # one row dataframe

            if not old_content:

                return

            system_prompt = self._get_system_prompt()

            start = time.time()
            new_content = self._enrich_chunk(system_prompt, old_content)
            end = time.time()

            await Retrieval.update_data(data_dict={"content": new_content, "original_content": new_content}, where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level_id": input_id, "level": self.level}, db=self.db)
            self.logger.log_step(task="table", layer=1, table_data={"old_content": old_content, "new_content": new_content, "duration": round(end - start, 2)})

            # in the last iteration step we update chunk_array
            for chunk_dict in chunk_array:
                if chunk_dict[f"{self.level}_id"] == input_id:
                    chunk_dict["paragraph"] = new_content

        return chunk_array






class ChunkingFilter:

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, where: str, model: str, prompt: str, history: bool = False):

        self.db = db
        self.user_id = user_id
        self.doc_id = doc_id
        self.level = where
        self.logger = logger

        self.prompt = prompt
        self.model = model

        self.chat_orchestrator: Optional[ChatOrchestrator] = None
        self.do_history = history
        self.history: list[dict[str, Any]] = []




    async def init_clients(self):
        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1",
                                                db=self.db)

        self.chat_orchestrator = ChatOrchestrator(user_key_list=user_key_list, base_api="https://chat-ai.academiccloud.de/v1")



    def filter_image_content(self, input_chunk):
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

        output_dict = json.loads(self.chat_orchestrator.call(self.model, system_prompt, user_prompt))

        return output_dict["Boolean"]



    async def run_method(self, chunk_array) -> None:
        # use the content of level to generate metadata for output_level (e.g. section for section, or section for paragraph)
        # for example generate a section summary to enrich each section or provide context for all paragraphs in that section

        # loggs
        await self.init_clients()

        rows, columns = await Retrieval.get_all(
            where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.level}, db=self.db)

        self.logger.log_step(task="info_text", log_text="Starting filtering chunks")

        input_df = pd.DataFrame(rows, columns=columns).sort_values(
            by="level_id")  # like the retrievals table, but one for each hierarchy level

        input_ids = list(set(input_df[f"level_id"]))

        irrelevant_ids = []
        for input_id in input_ids:
            # print(f"proceeding to enrich {input_id}")

            # instead of extracting chunk from paragraphs table, we search for the input or output column of the retrievals table

            content = input_df.loc[input_df["level_id"] == input_id, "content"].dropna().astype(str).iloc[0]  # one row dataframe

            if not content:
                print("Content is empty")
                return


            is_relevant = self.filter_image_content(content)

            if not is_relevant:
                irrelevant_ids.append(input_id)
                await Retrieval.delete_data(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level_id": input_id, "level": self.level}, db=self.db)



        # Finally we update chunk_array
        for i, chunk_dict in enumerate(chunk_array):
            if chunk_dict[f"{self.level}_id"] in irrelevant_ids:
                chunk_array.pop(i)

        return chunk_array





class ParagraphChunker(BaseChunker):

    """
    tokenizer_model and max_tokens can be empty

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, evaluator: ChunkerEvaluator , user_id: UUID, doc_id: UUID, level_name: str, doc_title: str,
                 with_title: bool, separator: str = "##", tokenizer_model: str = "", max_tokens: int = 0):

        super().__init__(db=db, logger=logger, evaluator=evaluator, user_id=user_id, doc_id=doc_id, level_name=level_name, with_title=with_title, doc_title=doc_title)


        self.tokenizer: BaseTokenizer = None
        self.model = tokenizer_model

        self.max_tokens = int(max_tokens) if max_tokens else 0
        self.separator = separator





    def compute_paragraph_length(self, paragraph):

        """
        if tokenizer_model is empty, paragraph length will be computed as the number of characters
        if max_tokens is empty, the max tokens of tokenizer_model will be used
        if tokenizer_model and max_tokens are empty, the chunking applied is equivalent to normal splitting based on regex
        """
        if not self.model and not self.max_tokens:
            return 1 # ensures that len(paragraph) > max_tokens

        elif not self.model:
            return len(paragraph)


        # if tokenizer_model was given with no max_tokens

        elif not self.tokenizer:
            self.tokenizer, self.max_tokens = self.get_tokenizer_tools(self.model, self.max_tokens)

        length = self.tokenizer.count_tokens(paragraph)
        return int(length)

    @staticmethod
    def normalize_newlines(text: str) -> str:
        if not text:
            return text

        # 1️⃣ Normalize all newline characters
        text = (
            text
            .replace("\r\n", "\n")
            .replace("\r", "\n")
            .replace("\u2028", "\n")
            .replace("\u2029", "\n")
            .replace("\u0085", "\n")
        )
        return text.strip()


    def chunk_text(self, input_chunk: str) -> List[str]:
        paragraphs = self.normalize_newlines(input_chunk).split(self.separator)
        chunks = []
        current = []
        current_len = 0



        for p in paragraphs:

            # Skip paragraphs that are empty or only whitespace
            p = p.strip()
            if not p:
                continue


            p_len = self.compute_paragraph_length(p)


            if current_len + p_len > self.max_tokens:

                """
                if current: # enable further paragraph chunking
                    current[0] = self.separator + current[0] """

                chunks.append(f"\n{self.separator}".join(current))

                current = [p]
                current_len = p_len
            else:
                current.append(p)
                current_len += p_len

        if current:
            chunks.append(f"\n{self.separator}".join(current))

        return chunks






class SlidingChunker(BaseChunker):

    """
    max_tokens and overlap_tokens can be empty
    tokenizer_model is mandatory
    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, evaluator: ChunkerEvaluator , user_id: UUID, doc_id: UUID, level_name: str, doc_title: str,
                 with_title: bool, tokenizer_model: str = "", max_tokens: int = 0, overlap_tokens: int = 0):

        super().__init__(db=db, logger=logger, evaluator=evaluator, user_id=user_id, doc_id=doc_id, level_name=level_name, with_title=with_title, doc_title=doc_title)

        self.tokenizer: BaseTokenizer = None
        self.model = tokenizer_model

        self.max_tokens = int(max_tokens) if max_tokens else 0


        self.overlap_tokens = int(overlap_tokens) if overlap_tokens else 0


    def encode_text(self, input_text):

        if not self.model:
            return input_text

        # at the first iteration
        elif not self.tokenizer:
            self.tokenizer, self.max_tokens = self.get_tokenizer_tools(self.model, self.max_tokens)

        output_tokens = self.tokenizer.get_tokenizer().encode(input_text)
        return output_tokens



    def decode_tokens(self, input_tokens):
        if not self.model:
            return input_tokens

        output_text = self.tokenizer.get_tokenizer().decode(input_tokens)

        return output_text


    def chunk_text(self, text):
        tokens = self.encode_text(text)
        chunks = []
        start = 0

        while start < len(tokens):
            end = start + self.max_tokens
            chunk_tokens = tokens[start:end]
            chunk_text = self.decode_tokens(chunk_tokens)
            chunks.append(chunk_text)
            start += self.max_tokens - self.overlap_tokens

        return chunks





class DoclingChunker(BaseChunker):
    """
    Base Docling Method for Hierarchical and Hybrid variants

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, evaluator: ChunkerEvaluator , user_id: UUID, doc_id: UUID, level_name: str, doc_title: str, with_title: bool):

        super().__init__(db=db, logger=logger, evaluator=evaluator, user_id=user_id, doc_id=doc_id, level_name=level_name, with_title=with_title, doc_title=doc_title)

        self.chunker = "" # expected from child class

    @staticmethod
    def convert_text(input_text: str):
        converter = DocumentConverter()

        result = converter.convert_string(
            content=input_text.replace("\r\n", "\n"),
            format=InputFormat.MD,
            name="input.md"
        )

        return result.document

    def chunk_text(self, input_chunk: str):

        dl_doc = self.convert_text(input_chunk)
        chunk_iter = self.chunker.chunk(dl_doc=dl_doc)
        output_chunks = [self.chunker.contextualize(chunk=chunk) for chunk in chunk_iter]

        return output_chunks

        


class HierarchicalDoclingChunker(DoclingChunker):

    def __init__(self, db: AsyncSession, logger: InfoLogger, evaluator: ChunkerEvaluator , user_id: UUID, doc_id: UUID, level_name: str, doc_title: str,
        with_title: bool, max_tokens: int, min_tokens, overlap, merge_across_blocks):
        super().__init__(db=db, logger=logger, evaluator=evaluator, user_id=user_id, doc_id=doc_id, level_name=level_name, with_title=with_title, doc_title=doc_title)

        self.chunker = self.compute_chunker(max_tokens, min_tokens, overlap, merge_across_blocks)

    @staticmethod
    def compute_chunker(max_tokens, min_tokens, overlap, merge_across_blocks):
        chunker = HierarchicalChunker(
            max_tokens=max_tokens,
            min_tokens=min_tokens,
            overlap=overlap,
            merge_across_blocks=merge_across_blocks,
        )
        return chunker








class HybridDoclingChunker(DoclingChunker):

    def __init__(self, db: AsyncSession, logger: InfoLogger, evaluator: ChunkerEvaluator , user_id: UUID, doc_id: UUID, level_name: str, doc_title: str,
        with_title: bool, tokenizer_model: str = "", max_tokens: int = 0):

        super().__init__(db=db, logger=logger, evaluator=evaluator, user_id=user_id, doc_id=doc_id, level_name=level_name, with_title=with_title, doc_title=doc_title)

        self.tokenizer, _ = self.get_tokenizer_tools(tokenizer_model, max_tokens)
        self.chunker = HybridChunker(tokenizer=self.tokenizer)

    @staticmethod
    def compute_chunker(tokenizer):
        return HybridChunker(tokenizer=tokenizer)




# ---------------- ORCHESTRATORS --------------------






# Run Chunking


EVALUATOR_TYPE_MAPPER = {
    "Chunking": ChunkerEvaluator,
    "Enriching": EnricherEvaluator,
}

async def run_chunking(pipelines: dict[str, list[dict[str, Any]]], user_id: UUID, doc_id: UUID, db: AsyncSession):

    _, input_path = await get_doc_paths(user_id, doc_id, db=db)
    log_path = await get_log_path(user_id, stage="chunking")
    session_logger = InfoLogger(log_path=log_path, stage="chunking")
    doc_title = await get_doc_title(user_id, doc_id, db=db)
    session_logger.log_step(task="header_1", log_text=f"Starting Chunking for document: {doc_title}")

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
        evaluator_method.update({"logger": session_logger, "user_id": user_id, "doc_id": doc_id, "db": db})
        evaluator_instance = EVALUATOR_TYPE_MAPPER[evaluator_type](**evaluator_method)
        pipeline_scores = []
        for i, pipeline in enumerate(evaluation_pipelines):
            session_logger.log_step(task="info_text", layer=2, log_text=f"Pipeline {i + 1}")
            log_pipeline_methods(session_logger, pipeline)

            await run_chunking_pipeline(method_list=pipeline, user_id=user_id, doc_id=doc_id, db=db, session_logger=session_logger, session_evaluator=evaluator_instance, input_path=input_path, log_path=log_path, doc_title=doc_title)

            pipeline_scores.append(evaluator_instance.pipeline_score)


        #  Overwrite last Retrieval content with the best chunking pipeline
        best_index = pipeline_scores.index(max(pipeline_scores))
        best_pipeline = sorted_pipelines[best_index]

        session_logger.log_step(task="header_2", log_text=f"Found best pipeline: Pipeline {best_index}")

        await run_chunking_pipeline(method_list=best_pipeline, user_id=user_id, doc_id=doc_id, db=db, session_logger=session_logger, session_evaluator=evaluator_instance, input_path=input_path, log_path=log_path, doc_title=doc_title)



    # If there is no evaluator, run the first pipeline only
    else:

        pipeline = sorted_pipelines[0]
        session_logger.log_step(task="header_2", layer=2, log_text=f"Running Pipeline 1")
        log_pipeline_methods(session_logger, pipeline)

        await run_chunking_pipeline(method_list=pipeline, user_id=user_id, doc_id=doc_id, db=db, session_logger=session_logger, session_evaluator=None, input_path=input_path, log_path=log_path, doc_title=doc_title)



    # Finally we export the logs to md
    await export_logs(log_path)




# Run each Pipeline

CHUNKING_TYPE_MAPPER = {
    "Paragraph Chunker": ParagraphChunker,
    "Hybrid Chunker": HybridChunker,
    "Sliding Window Chunker": SlidingChunker,
    "Enricher": ChunkingEnricher,
    "Filter": ChunkingFilter,
}

async def run_chunking_pipeline(method_list: list[dict[str, Any]], user_id: UUID, doc_id: UUID, db: AsyncSession, session_logger: InfoLogger, session_evaluator: ChunkerEvaluator, input_path: str, log_path: str, doc_title: str):

    def insert_past_levels(method_list):
       """
       Aimed at "Enricher" and "Filter" methods
       """
       first_method = method_list[0]
       if first_method["type"] in ["Enricher", "Filter"]:
           first_method["level_name"] = "document"

       for i in range(1, len(method_list)):
           method = method_list[i]
           if method["type"] in ["Enricher", "Filter"]:
               method["level_name"] = method_list[i-1]["level_name"]

       # finally change level key to match the Enricher/Filter class
       for method in method_list:
           if method["type"] in ["Enricher", "Filter"] and "level_name" in method:
               method["where"] = method.pop("level_name")

       return method_list




    # LIMIT Chunking iterations
    method_limit = 2

    # Delete previous occurrences of this doc in the "Retrievals" table
    await Retrieval.delete_data({"user_id": user_id, "doc_id": doc_id}, db)

    async def generate_offspring(input_chunks, input_method):
        output_chunks = []
        for input_chunk in input_chunks:

            new_chunks = await input_method.run_text_chunking(input_chunk)
            output_chunks += new_chunks

        return output_chunks


    # insert levels of previous chunker/method to each Enricher/Filter
    method_list = insert_past_levels(method_list)

    first_method = method_list.pop(0)
    method_type = first_method.pop("type")
    first_method.update({"logger": session_logger, "evaluator": session_evaluator, "user_id": user_id, "doc_id": doc_id, "db": db, "doc_title": doc_title})

    session_logger.log_step(task="info_text", log_text=f"Attempting to init first method for user: {user_id}")
    method_instance = CHUNKING_TYPE_MAPPER[method_type](**first_method)


    # Record Pipeline Start
    pipeline_start = time.time()

    # apply first chunker to the document at this path
    doc_start = time.time()
    old_chunk_array = await method_instance.run_doc_chunking(input_path)
    doc_end = time.time()

    session_logger.log_step(task="info_text", layer=2, log_text=f"Chunking at {first_method["level_name"]} level completed in {round(doc_end - doc_start, 2)} seconds ")

    #Commit evaluation of the first method
    if session_evaluator:
        session_evaluator.commit_evaluation()



    new_chunk_array = []


    for i, method in enumerate(method_list):
        # New Chunking Method
        method_type = method.pop("type")

        # We don't evaluate these methods (not propper chunkers)
        if method_type in ["Enricher", "Filter"]:
            method.update({"logger": session_logger, "user_id": user_id, "doc_id": doc_id, "db": db, "doc_title": doc_title})

            # Instance new method
            method_instance = CHUNKING_TYPE_MAPPER[method_type](**method)

            text_start = time.time()
            new_chunk_array = await method_instance.run_method(old_chunk_array)
            text_end = time.time()

            session_logger.log_step(task="info_text", layer=2, log_text=f"{method_type} step at {method["level_name"]} level completed in {round(text_end - text_start, 2)} seconds ")



        else:
            if session_evaluator:
                session_evaluator.current_level = method["level_name"]

            method.update({"logger": session_logger, "evaluator": session_evaluator, "user_id": user_id, "doc_id": doc_id, "db": db, "doc_title": doc_title})

            # Instance new method
            method_instance = CHUNKING_TYPE_MAPPER[method_type](**method)

            # Generate offspring based on past generation of chunks
            text_start = time.time()
            new_chunk_array = await generate_offspring(old_chunk_array, method_instance)
            text_end = time.time()

            session_logger.log_step(task="info_text", layer=2, log_text=f"Chunking at {method["level_name"]} level completed in {round(text_end - text_start, 2)} seconds ")

            # Commit evaluation of method
            if session_evaluator:
                session_evaluator.commit_evaluation()



        if i+2 > min(method_limit, len(method_list)): break

        old_chunk_array = new_chunk_array


    pipeline_end = time.time()


    # After all chunking iterations, we introduce the latest new_chunks into the "Paragraphs" table with all recorded level IDs
    session_logger.log_step(task="info_text", layer=2, log_text=f"Completed chunking in {round(pipeline_end - pipeline_start, 2)} seconds")


    # First delete previous occurrences of this doc in the table
    await Paragraph.delete_data({"user_id": user_id, "doc_id": doc_id}, db)

    session_logger.log_step(task="table", layer=1, log_text=f"Inserting following data into the Paragraphs table", table_data=new_chunk_array)

    for chunk_dict in new_chunk_array:
        #session_logger.log_step(task="info_text", log_text=f"Inserting dict: {chunk_dict}")
        await Paragraph.insert_paragraphs(data_dict=chunk_dict, db=db)



            
        
            



# Levels


async def load_chunking_levels(user_id: UUID, doc_id: UUID, db: AsyncSession)-> List[str]:



    rows, columns = await Retrieval.get_all(where_dict={"user_id": user_id, "doc_id": doc_id}, db=db)
    retrieval_df = pd.DataFrame(rows, columns=columns)

    chunking_levels = list(set(retrieval_df["level"]))

    return chunking_levels



# Results


async def load_chunking_results(user_id: UUID, doc_id: UUID, db: AsyncSession)-> List[Dict[str, Any]]:



    rows, columns = await Retrieval.get_all(where_dict={"user_id": user_id, "doc_id": doc_id}, db=db)
    retrieval_df = pd.DataFrame(rows, columns=columns)

    indexed_levels = list(set(retrieval_df["level"]))

    output_list = []
    for level in indexed_levels:
        level_mask = retrieval_df["level"] == level
        item_list = retrieval_df.loc[level_mask, ["retrieval_id", "title", "content"]].to_dict(orient="records")

        output_list.append({"level": level, "items": item_list})

    return output_list




async def update_chunking_results(user_id: UUID, db: AsyncSession, result_list: List[Dict[str, Any]]):


    df0 = pd.DataFrame(result_list).explode("items", ignore_index=True)
    df = df0.drop(columns=["items"]).join(pd.json_normalize(df0["items"]))

    input_list = df.to_dict(orient="records")

    for row in input_list:
        # we only need to add the user_id, as row already contains the pk "retrieval_id"
        row["user_id"] = user_id
        data_dict = {"content": row.pop("content")}

        await Retrieval.update_data(data_dict=data_dict, where_dict=row, db=db)



# MARKDOWN RESULTS


