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
from app.rag_services.evaluator_service import ChunkerEvaluator, EnricherEvaluator, evaluation_wrapper
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

from app.rag_services.helpers import get_doc_paths, get_log_path, get_doc_title, get_user_api_keys, log_pipeline_methods, ExtractionError


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




import base64
import binascii



class ImageConverter:

    def __init__(self, user_id: UUID, db: AsyncSession, logger: InfoLogger, prompt: str, image_starting_mark: str, image_ending_mark: str):
        self.user_id = user_id
        self.db = db
        self.logger = logger

        self.image_id = 0
        self.prompt = prompt
        self.image_starting_mark = image_starting_mark
        self.image_ending_mark = image_ending_mark

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



    @staticmethod
    def is_valid_base64(s: str) -> bool:
        if not isinstance(s, str) or not s:
            return False

        try:
            # Remove whitespace (base64 often contains newlines)
            s_clean = "".join(s.split())

            # Validate + decode
            base64.b64decode(s_clean, validate=True)

            return True
        except (binascii.Error, ValueError):
            return False



    async def process_b64_images(self, line):


        def replace_with_dict(match):
            key = match.group(0)  # the full matched string, e.g. "picture-1.png"
            image_caption = self.image_dict_b64.get(key, "")  # fallback to "" if not found

            return image_caption


        if line.endswith(".png"):
            b64_image = re.sub(r"picture-\d+\.png", replace_with_dict, line)


            if self.is_valid_base64(b64_image):
                #start = time.time()
                response = await self.vision_client.describe(b64_image, question=self.prompt, label="vision_only")
                #end = time.time()

                pattern = r"\*\*Main Object:\*\*(.*?)\*\*Text Captions:\*\*"
                match = re.search(pattern, response, flags=re.DOTALL)
                if match:
                    content = match.group(1).strip()
                    #self.logger.log_step(task="info_text", layer=1, log_text=f"Generated following Image Content in {round(end - start, 2)} seconds:\n\n {content}")

                    return f"{self.image_starting_mark}\n" + content + f"\n{self.image_ending_mark}"


        return line



            
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
                 do_ocr: bool, keep_tables: bool, ocr_prompt: str):
        super().__init__(db=db, logger=logger, user_id=user_id, doc_id=doc_id, input_path=input_path, output_path=output_path)

        # --- IMAGE LOGIC ---
        self.do_ocr = do_ocr
        self.keep_tables = keep_tables

        # --------------------
        self.image_converter = ImageConverter(user_id=user_id, db=db, logger=self.logger, prompt=ocr_prompt, image_starting_mark="[IMAGE_START]", image_ending_mark="[IMAGE_END]")

        self.docling_client = ""


    async def init_clients(self):

        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1", db=self.db)

        self.docling_client = DoclingClient(user_key_list=user_key_list, base_api="https://chat-ai.academiccloud.de/v1")




    async def convert_file(self, input_path: str):

        await self.init_clients()

        start = time.time()
        result = await self.docling_client.convert(
            file_path=input_path,
            response_type=DoclingOutputType.MARKDOWN,
            extract_tables_as_images=False,
        )
        end = time.time()

        if not isinstance(result, dict):
            raise ExtractionError(
                "Invalid Docling response format (expected object)",
                status_code=502,
            )

        md_text = result.get("markdown")
        images = result.get("images")

        # Validate markdown
        if not isinstance(md_text, str) or not md_text.strip():
            raise ExtractionError(
                "Docling response does not contain valid markdown",
                status_code=422,
            )

        # Validate images
        if not isinstance(images, list):
            raise ExtractionError(
                "Docling response does not contain valid images list",
                status_code=422,
            )



        self.logger.log_step(task="info_text", layer=1, log_text=f"Doc converted to Markdown in {round(end - start, 2)} seconds")




        # convert images or delete the references
        if self.do_ocr:
            start = time.time()
            await self.image_converter.init_clients()
            #await self.image_converter.init_image_dict(images)
            self.image_converter.init_b64_image_dict(images)
            end = time.time()

            self.logger.log_step(task="info_text", layer=1, log_text=f"b64 fict initiated in {round(end - start, 2)} seconds")

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

        in_table = False
        for i, line in enumerate(lines):

            # insert table mark
            if line.startswith("|") and not in_table:
                in_table = True
                line = f"[TABLE_START]\n{line}"

            elif line == "" and in_table:
                in_table = False
                line = "[TABLE_END]"

            # process images
            if self.do_ocr:
                line = await self.image_converter.process_b64_images(line) # self.image_converter.process_images(line)


            if (self.keep_tables or not in_table):
                output_dict["text"] += f"{line}\n"


        return output_dict["text"]



    async def run_conversion(self) -> None:
        # First, check if there is any Doc_ID in the  "Docs" table that doesn't have a paragraphs table.
        # Then, run the docling client and process the markdown text


        output_text = await self.convert_file(self.input_path)

        with open(self.output_path, "w", encoding="utf-8") as f:
            f.write(output_text)




class DoclingConverter(BaseConverter):
    """
    Base Docling Method for Hierarchical and Hybrid variants

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id, doc_id: UUID,
                 input_path: str, output_path: str, do_ocr=True, keep_tables=True):

        super().__init__(db=db, logger=logger, user_id=user_id, doc_id=doc_id, input_path=input_path, output_path=output_path)

        self.do_ocr = do_ocr
        self.do_table_structure = keep_tables
        # Force CPU

    def convert_file(self, input_path: str):
        try:
            pipeline_options = PdfPipelineOptions()
            pipeline_options.do_ocr = self.do_ocr
            pipeline_options.do_table_structure = self.do_table_structure
            pipeline_options.table_structure_options.do_cell_matching = True

            doc_converter = DocumentConverter(
                format_options={
                    InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
                }
            )
        except Exception as e:
            raise ExtractionError(
                f"Failed to initialize document converter: {str(e)}",
                status_code=500,
            ) from e

        try:
            start = time.time()
            result = doc_converter.convert(source=input_path)
        except Exception as e:
            raise ExtractionError(
                f"Document conversion failed for file '{input_path}': {str(e)}",
                status_code=502,
            ) from e

        try:
            dl_doc = result.document
        except Exception as e:
            raise ExtractionError(
                f"Conversion result missing document for file '{input_path}'",
                status_code=502,
            ) from e

        try:
            output = dl_doc.export_to_markdown()
        except Exception as e:
            raise ExtractionError(
                f"Failed to export document to markdown for file '{input_path}': {str(e)}",
                status_code=502,
            ) from e

        end = time.time()

        if not isinstance(output, str) or not output.strip():
            raise ExtractionError(
                f"Exported markdown is empty for file '{input_path}'",
                status_code=422,
            )

        self.logger.log_step(
            task="header_2",
            log_text=f"Doc converted to Markdown in {round(end - start, 2)} seconds",
        )

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
    "Custom Conversion": CustomConverter,
}

def pop_processing_args(input_dict):
    image_args = [
        "image_filter",
        "image_filter_model",
        "image_filter_prompt",
        "image_rewrite",
        "image_rewrite_model",
        "image_rewrite_prompt",
    ]
    table_args = [
        "table_filter",
        "table_filter_model",
        "table_filter_prompt",
        "table_rewrite",
        "table_rewrite_model",
        "table_rewrite_prompt",
    ]

    image_dict = {}
    for arg in image_args:
        image_dict[arg] = input_dict.pop(arg)

    table_dict = {}
    for arg in table_args:
        table_dict[arg] = input_dict.pop(arg)

    return image_dict, table_dict






async def run_processing(image_dict, table_dict, md_path, user_id: UUID, db: AsyncSession, logger: InfoLogger):

    #========================================================
    #==================== Filtering =========================
    # ========================================================

    # ==================== Image =========================

    logger.log_step(task="info_text", log_text=f"procssing tables with these instructions: {table_dict}")

    if image_dict["image_filter"]:
        image_filter_args = {"user_id": user_id, "db": db, "logger": logger, "model": image_dict["image_filter_model"],
                             "prompt": image_dict["image_filter_prompt"], "starting_mark": "[IMAGE_START]", "ending_mark": "[IMAGE_END]"}


        filter_instance = ItemFilter(**image_filter_args)
        await filter_instance.run_method(md_path)

    # ==================== Table =========================

    if table_dict["table_filter"]:
        table_filter_args = {"user_id": user_id, "db": db, "logger": logger, "model": table_dict["table_filter_model"],
                             "prompt": table_dict["table_filter_prompt"], "starting_mark": "[TABLE_START]", "ending_mark": "[TABLE_END]"}


        filter_instance = ItemFilter(**table_filter_args)
        await filter_instance.run_method(md_path)

    # ========================================================
    # ==================== Rewriting =========================
    # ========================================================

    # ==================== Image =========================

    if image_dict["image_rewrite"]:
        image_rewrite_args = {"user_id": user_id, "db": db, "logger": logger, "model": image_dict["image_rewrite_model"],
                             "prompt": image_dict["image_rewrite_prompt"], "starting_mark": "[IMAGE_START]",
                             "ending_mark": "[IMAGE_END]"}

        filter_instance = ItemEnricher(**image_rewrite_args)
        await filter_instance.run_method(md_path)



    # ==================== Table =========================

    if table_dict["table_rewrite"]:
        table_rewrite_args = {"user_id": user_id, "db": db, "logger": logger, "model": table_dict["table_rewrite_model"],
                             "prompt": table_dict["table_rewrite_prompt"], "starting_mark": "[TABLE_START]", "ending_mark": "[TABLE_END]"}

        filter_instance = ItemEnricher(**table_rewrite_args)
        await filter_instance.run_method(md_path)



    # remove image and table marks (needed if rewriters didn't run)
    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()
        md_text = md_text.replace("[TABLE_START]", "", 1).replace("[TABLE_END]", "", 1)
        md_text = md_text.replace("[IMAGE_START]", "", 1).replace("[IMAGE_END]", "", 1)

    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_text)





async def run_conversion(converter_dict: Dict[str, Any], user_id: UUID, doc_id: UUID, db: AsyncSession):

    input_path, output_path = await get_doc_paths(user_id, doc_id, db=db)
    log_path = await get_log_path(user_id, stage="conversion")
    session_logger = InfoLogger(log_path=log_path, stage="conversion")

    # logg
    doc_title = await get_doc_title(user_id, doc_id, db=db)
    session_logger.log_step(task="header_1", layer=2, log_text=f"Starting Conversion to Markdown for document: {doc_title}")
    session_logger.log_step(task="table", layer=2, log_text=f"Using following method: ", table_data=converter_dict)



    converter_dict.update({"db": db, "user_id": user_id, "doc_id": doc_id, "input_path": input_path, "output_path": output_path, "logger": session_logger})
    converter_type = converter_dict.pop("type")

    # extract processing args
    if converter_type == "Custom Conversion":
        image_dict, table_dict = pop_processing_args(converter_dict)


    converter = CONVERSION_TYPE_MAPPER[converter_type](**converter_dict)

    method_start = time.time()
    await maybe_await(converter.run_conversion())
    method_end = time.time()

    # run processing
    if converter_type == "Custom Conversion":
        await run_processing(image_dict, table_dict, output_path, user_id, db, session_logger)


    # Finally we label this doc as "converted"
    await DocPipelines.update_data(data_dict={"converted": 1}, where_dict={"user_id": user_id, "doc_id": doc_id},
                          db=db)


    # And after that export the logs to md

    await export_logs(log_path)






# ---------------------------------------------

# ---------------- Markdown post-processing --------------------

# ---------------------------------------------
def scan_paragraphs(starting_mark, ending_mark, lines: List[str]):

    item_lines = set()

    in_item = False

    for i, line in enumerate(lines):
        line = line.strip()

        if not in_item:
            if line == starting_mark:
                item_lines.add(i)
                in_item = True

        else:
            if line == ending_mark:
                item_lines.add(i)
                in_item = False
            else:
                item_lines.add(i)

    return item_lines


class ItemEnricher:
    """
    Enriches text items like tables, images, based on regex identifiers
    """

    def __init__(self, user_id: UUID, logger: InfoLogger, db: AsyncSession, prompt: str, model: str,
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

    # ============================================================
    # INTERNAL HELPERS
    # ============================================================

    @staticmethod
    def unwrap_answer(chat_output: str) -> Any:
        if not isinstance(chat_output, str):
            raise ExtractionError("Invalid response type (expected string)", status_code=422)

        try:
            data = json.loads(chat_output)
        except json.JSONDecodeError:
            raise ExtractionError("Response is not valid JSON", status_code=422)

        if not isinstance(data, dict):
            raise ExtractionError("Response JSON is not an object", status_code=422)

        output = data.get("output")
        if isinstance(output, str):
            return output.strip()

        raise ExtractionError("No valid 'output' field found in response", status_code=422)




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

        return self.unwrap_answer(output_dict)

    def _enrich_chunk(self, chunk: str) -> str:
        # Qwen3-Coder is explicitly an instruction-tuned coder model, so its usage profile lines up with OpenAIs mini line

        system_prompt = f"""
                You are an assistant that processes text chunks.

                Return ONLY valid JSON with exactly this structure:
                {{
                  "output": "string"
                }}

                The value of "output" must satisfy this instruction exactly:
                {self.prompt}

                Rules:
                - Use the chunk content as the source.
                - Do not repeat the instruction text.
                - Do not return a schema.
                - Do not return keys other than "output".
                - Do not use markdown code fences.
                - If the chunk does not contain enough meaningful information to satisfy the instruction, return:
                  {{"output": ""}}
                """.strip()

        user_prompt = f"""
                Apply this instruction to the chunk below:
                {self.prompt}

                Chunk Content:
                ---
                {chunk}
                ---
                """.strip()

        enriched_output = self._call_orchestrator(system_prompt, user_prompt)

        return enriched_output






    def process_items(self, i, line, output_dict):

        if i in self.item_lines:
            # update actual paragraph for next iteration
            self.current_chunk += line
            return True

        if self.current_chunk:

            self.current_chunk = self.current_chunk.replace(self.starting_mark, "", 1).replace(self.ending_mark, "", 1)

            # process item into readable text
            explained_item = self._enrich_chunk(self.current_chunk)


            output_dict["text"] += f"{explained_item}\n"

            #self.logger.log_step(task="table", layer=1, log_text=f"Explained new item: ", table_data={"Input": self.current_chunk, "Output": explained_item})

            self.current_chunk = ""

        return False





    def process_last_item(self, output_dict):
        if self.current_chunk:
            self.current_chunk = self.current_chunk.replace(self.starting_mark, "", 1).replace(self.ending_mark, "", 1)

            explained_item = self._enrich_chunk(self.current_chunk)

            output_dict["text"] += f"{explained_item}\n"

            #self.logger.log_step(task="table", layer=1, log_text=f"Explained last item: ", table_data={"Input": self.current_chunk, "Output": explained_item})




    async def run_method(self, md_path: str):


        with open(md_path, "r", encoding="utf-8") as f:
            md_text = f.read()

        lines = md_text.split("\n")
        # search items, if the required chunker is provided

        start = time.time()
        await self.init_clients()

        self.item_lines = scan_paragraphs(self.starting_mark, self.ending_mark, lines)
        end = time.time()

        self.logger.log_step(task="info_text", layer=1, log_text=f"Scanned items in {round(end - start, 2)} seconds")

        # initialize the paragraph_dict. If no chunkers are provided it will only store paragraphs and record their section_id

        output_dict = {"text": ""}

        # create new items for this document, if they don't exist

        # start processing paragraphs
        start = time.time()
        for i, line in enumerate(lines):

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

    @staticmethod
    def extract_bool(s):
        json_error = None

        try:
            x = json.loads(s) if isinstance(s, str) else s

            if isinstance(x, bool):
                return x

            if isinstance(x, dict):
                for v in x.values():
                    if isinstance(v, bool):
                        return v

        except json.JSONDecodeError as e:
            json_error = str(e)

        # Regex fallback
        m = re.search(r'\btrue\b|\bfalse\b', str(s), re.I)
        if m:
            return m.group(0).lower() == "true"

        if json_error:
            raise ExtractionError(
                f"No boolean found in response. JSON parsing issue: {json_error}",
                status_code=422,
            )

        raise ExtractionError(
            "No boolean found in response",
            status_code=422,
        )



    async def init_clients(self):
        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1",
                                                db=self.db)

        self.chat_orchestrator = ChatOrchestrator(user_key_list=user_key_list,
                                                  base_api="https://chat-ai.academiccloud.de/v1")

    def _call_orchestrator(self, user_prompt, system_prompt):
        if self.do_history:

            chat_output = self.chat_orchestrator.call_with_history(label=self.model, system_prompt=system_prompt,
                                                                   user_prompt=user_prompt, history=self.history)

            # self.logger.log_step(task="info_text", log_text=f"Unwrapping following answer: {chat_output}")
            output_bool = self.extract_bool(chat_output)

            # update history list with user and assistant input of the new call
            self.history += [{"role": "user", "content": user_prompt},
                             {"role": "assistant", "content": str(output_bool)}]

        else:
            chat_output = self.chat_orchestrator.call(label=self.model, system_prompt=system_prompt,
                                                      user_prompt=user_prompt)
            # self.logger.log_step(task="info_text", log_text=f"Unwrapping following answer: {chat_output}")

            output_bool = self.extract_bool(chat_output)

        return output_bool

    def _decide_relevance(self, input_chunk):
        """
                Rewrites image content with paragraphs describing it - if it aligns with the main topic of the file. Otherwise, it removes it.
                Should remove descriptions of logos and layout symbols
        """

        system_prompt = f"""
                        You are an assistant that processes text chunks.

                        Return ONLY valid JSON with exactly this structure:
                        {{
                          "output": "boolean"
                        }}

                        The value of "output" must satisfy this instruction exactly:
                        {self.prompt}

                        Rules:
                        - Use the chunk content as the source.
                        - Do not repeat the instruction text.
                        - Do not return a schema.
                        - Do not return keys other than "output".
                        - Do not use markdown code fences.
                        """.strip()

        user_prompt = f"""
                        Apply this instruction to the chunk below:
                        {self.prompt}

                        Chunk Content:
                        ---
                        {input_chunk}
                        ---
                        """.strip()

        # self.logger.log_step(task="info_text", layer=1, log_text=f"Starting to filter following chunk: {input_chunk}")

        bool_output = self._call_orchestrator(user_prompt, system_prompt)

        return bool_output





    def process_items(self, i, line, output_dict):

        if i in self.item_lines:
            # update actual paragraph for next iteration
            self.current_chunk += f"{line}\n"
            return True

        if self.current_chunk:

            input_chunk = self.current_chunk.replace(self.starting_mark, "", 1).replace(self.ending_mark, "", 1)

            is_relevant = self._decide_relevance(input_chunk)

            if is_relevant:
                output_dict["text"] += f"{self.current_chunk}\n"

            else:
                self.logger.log_step(task="info_text", layer=1, log_text=f"Removed item:\n {self.current_chunk}\n")


            self.current_chunk = ""

        return False




    def process_last_item(self, output_dict):
        if self.current_chunk:
            is_relevant = self._decide_relevance(self.current_chunk)

            if is_relevant:
                output_dict["text"] += f"{self.current_chunk}\n"

                #self.logger.log_step(task="info_text", layer=1, log_text=f"Saved last item:\n {current_chunk}\n")

            else:
                self.logger.log_step(task="info_text", layer=1, log_text=f"Removed last item:\n {self.current_chunk}\n")






    async def run_method(self, md_path: str):


        with open(md_path, "r", encoding="utf-8") as f:
            md_text = f.read()

        lines = md_text.split("\n")
        # search items, if the required chunker is provided

        start = time.time()
        await self.init_clients()

        self.item_lines = scan_paragraphs(self.starting_mark, self.ending_mark, lines)
        end = time.time()

        self.logger.log_step(task="info_text", layer=1, log_text=f"Scanned items in {round(end - start, 2)} seconds")

        # initialize the paragraph_dict. If no chunkers are provided it will only store paragraphs and record their section_id

        output_dict = {"text": ""}

        # create new items for this document, if they don't exist

        # start processing paragraphs
        start = time.time()
        for i, line in enumerate(lines):

            #line = line.strip()
            #if not line:
                #continue

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

        # -----------------------------
        # Load tokenizer from HuggingFace
        # -----------------------------
        try:
            hf_tok = AutoTokenizer.from_pretrained(model)
        except Exception as e:
            raise ExtractionError(
                f"Failed to load tokenizer for model '{model}'. Model may not exist or is not accessible: {str(e)}",
                status_code=404,
            ) from e

        # -----------------------------
        # Validate tokenizer object
        # -----------------------------
        if hf_tok is None:
            raise ExtractionError(
                f"Tokenizer loading returned None for model '{model}'",
                status_code=500,
            )

        # -----------------------------
        # Max tokens handling
        # -----------------------------

        if not max_tokens:
            max_tokens = hf_tok.model_max_length
            self.logger.log_step(task="info_text", layer=1, log_text=f"Setting max_tokens={max_tokens} corresponding to {model}")

        else:
            self.logger.log_step(task="info_text", layer=1, log_text=f"Keeping max_tokens={max_tokens}")



        token_limit = 100000  # prevent too big embeddings given by wrong max_tokens

        if max_tokens > token_limit:

            self.logger.log_step(task="info_text", layer=1, log_text=f"Tokens too big. Setting max_tokens={token_limit}")

            max_tokens = token_limit

        # -----------------------------
        # Wrap tokenizer
        # -----------------------------
        try:
            tokenizer: BaseTokenizer = HuggingFaceTokenizer(
                tokenizer=hf_tok,
                max_tokens=max_tokens,
            )
        except Exception as e:
            raise ExtractionError(
                f"HuggingFace tokenizer for model '{model}' is not supported or incompatible: {str(e)}",
                status_code=422,
            ) from e



        return tokenizer, int(max_tokens)
    

        






    async def run_text_chunking(self, meta_dict: Dict[str, Any])-> List[Dict[str, Any]]:





        input_chunk = meta_dict.pop("paragraph")
        # now meta_dict holds only the parent level IDs

        # method of the child class

        output_chunks = self.chunk_text(input_chunk)


        #self.logger.log_step(task="info_text", log_text=f"Can we run evaluation?. We have this evaluator: {self.evaluator}")
        # Evaluate Chunking
        if self.evaluator:
            #self.logger.log_step(task="info_text", log_text=f"Yes we can run it, with input chunk:\n {input_chunk}\n and output chunks:\n {output_chunks}")

            await self.evaluator.run_evaluation(input_chunk=input_chunk, output_chunks=output_chunks)




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
            # count words, if no tokenizer was specified
            return len(paragraph.split(" "))#len(paragraph)


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

                self.logger.log_step(task="info_text", log_text=f"New chunk starting with: {p}")

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

        # if no tokenizer model, use words as tokens
        if not self.model:
            output_tokens = input_text.split(" ")
            return output_tokens

        # if tokenizer model, init tokenizer at the first iteration
        elif not self.tokenizer:
            self.tokenizer, self.max_tokens = self.get_tokenizer_tools(self.model, self.max_tokens)

        output_tokens = self.tokenizer.get_tokenizer().encode(input_text)
        return output_tokens



    def decode_tokens(self, input_tokens):
        if not self.model:
            return input_tokens

        output_text = self.tokenizer.get_tokenizer().decode(input_tokens)

        return output_text


    def chunk_text(self, text: str)-> list[str]:
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

        normalized_text = input_text.replace("\r\n", "\n")

        try:
            result = converter.convert_string(
                content=normalized_text,
                format=InputFormat.MD,
                name="input.md",
            )
        except Exception as e:
            raise ExtractionError(
                f"Text conversion failed: {str(e)}",
                status_code=502,
            ) from e

        try:
            document = result.document

        except Exception as e:
            raise ExtractionError(
                "Converted text result is missing document",
                status_code=502,
            ) from e


        if document is None:
            raise ExtractionError(
                "Converted text result returned no document",
                status_code=502,
            )

        return document

    def chunk_text(self, input_chunk: str):

        dl_doc = self.convert_text(input_chunk)
        chunk_iter = self.chunker.chunk(dl_doc=dl_doc)
        output_chunks = [self.chunker.contextualize(chunk=chunk) for chunk in chunk_iter]

        return output_chunks

        


class HierarchicalDoclingChunker(DoclingChunker):

    def __init__(self, db: AsyncSession, logger: InfoLogger, evaluator: ChunkerEvaluator , user_id: UUID, doc_id: UUID, level_name: str, doc_title: str,
        with_title: bool, max_tokens: int, min_tokens, overlap, merge_across_blocks):
        super().__init__(db=db, logger=logger, evaluator=evaluator, user_id=user_id, doc_id=doc_id, level_name=level_name, with_title=with_title, doc_title=doc_title)

        try:
            self.chunker = HierarchicalChunker(
                max_tokens=max_tokens,
                min_tokens=min_tokens,
                overlap=overlap,
                merge_across_blocks=merge_across_blocks,
            )
        except Exception as e:
            raise ExtractionError(
                f"Failed to initialize HierarchicalChunker with "
                f"max_tokens={max_tokens}, min_tokens={min_tokens}, "
                f"overlap={overlap}, merge_across_blocks={merge_across_blocks}: {str(e)}",
                status_code=500,
            ) from e









class HybridDoclingChunker(DoclingChunker):

    def __init__(self, db: AsyncSession, logger: InfoLogger, evaluator: ChunkerEvaluator , user_id: UUID, doc_id: UUID, level_name: str, doc_title: str,
        with_title: bool, tokenizer_model: str = "", max_tokens: int = 0):

        super().__init__(db=db, logger=logger, evaluator=evaluator, user_id=user_id, doc_id=doc_id, level_name=level_name, with_title=with_title, doc_title=doc_title)

        self.tokenizer, _ = self.get_tokenizer_tools(tokenizer_model, max_tokens)

        try:

            self.chunker = HybridChunker(tokenizer=self.tokenizer)

        except Exception as e:
            raise ExtractionError(
                f"Failed to initialize HybridChunker with {tokenizer_model} tokenizer model",
                status_code=500,
            ) from e



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

    evaluator_args = {"user_id": user_id, "doc_id": doc_id, "db": db, "session_logger": session_logger}
    runner_args = {"user_id": user_id, "doc_id": doc_id, "db": db, "session_logger": session_logger,
                   "input_path": input_path, "doc_title": doc_title}

    # Delete previous chunks of this doc in the "Retrievals" table
    await Retrieval.delete_data(where_dict={"user_id": user_id, "doc_id": doc_id},
                                db=db)

    await evaluation_wrapper(pipelines=pipelines, evaluator_args=evaluator_args, runner_args=runner_args,
                             session_logger=session_logger, log_path=log_path, runner_fn=run_chunking_pipeline)








# Run each Pipeline

CHUNKING_TYPE_MAPPER = {
    "Paragraph Chunker": ParagraphChunker,
    "Hybrid Chunker": HybridChunker,
    "Sliding Window Chunker": SlidingChunker,
}


async def get_doc_chunk(input_path, user_id, doc_id, db, doc_title):


    await Retrieval.insert_data(data_dict={"level": "document", "level_id": 1, "user_id": user_id,
                                           "doc_id": doc_id, "title": doc_title}, db=db)
    try:
        if not os.path.isfile(input_path):
            raise ExtractionError(
                f"Markdown file not found: {input_path}",
                status_code=404,
            )

        with open(input_path, "r", encoding="utf-8") as f:
            md_text = f.read()

    except ExtractionError:
        raise

    except Exception as e:
        raise ExtractionError(
            f"Failed to read markdown file: {str(e)}",
            status_code=500,
        ) from e


    # This dict will contain all metadata for the final insert in the "Paragraphs" table
    first_array = [{"paragraph": md_text, "user_id": user_id, "doc_id": doc_id, "document_id": 1}]


    return first_array




async def run_chunking_pipeline(method_list: list[dict[str, Any]], user_id: UUID, doc_id: UUID, db: AsyncSession, session_logger: InfoLogger, session_evaluator: ChunkerEvaluator, input_path: str, doc_title: str):






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




    # Record Pipeline Start
    pipeline_start = time.time()

    # Extract the text chunk of the document at this path
    session_logger.log_step(task="info_text", layer=1, log_text=f"Starting Doc chunking")
    old_chunk_array = await get_doc_chunk(input_path, user_id, doc_id, db, doc_title)



    new_chunk_array = []


    for i, method in enumerate(method_list):
        method.pop("color", None)
        # New Chunking Method
        method_type = method.pop("type")

        # We don't evaluate these methods (not propper chunkers)
        if method_type in ["Enricher", "Filter"]:
            method.update({"logger": session_logger, "user_id": user_id, "doc_id": doc_id, "db": db})

            # Instance new method
            method_instance = CHUNKING_TYPE_MAPPER[method_type](**method)

            text_start = time.time()
            new_chunk_array = await method_instance.run_method(old_chunk_array)
            text_end = time.time()

            session_logger.log_step(task="info_text", layer=2, log_text=f"{method_type} step at {method["where"]} level completed in {round(text_end - text_start, 2)} seconds ")



        else:
            if session_evaluator:
                session_evaluator.current_level = method["level_name"]

            method.update({"logger": session_logger, "evaluator": session_evaluator, "user_id": user_id, "doc_id": doc_id, "db": db, "doc_title": doc_title})

            # Instance new method
            method_instance = CHUNKING_TYPE_MAPPER[method_type](**method)
            #session_logger.log_step(task="info_text", log_text="Can we generate offspring?")

            # Generate offspring based on past generation of chunks
            text_start = time.time()

            new_chunk_array = await generate_offspring(old_chunk_array, method_instance)
            text_end = time.time()

            session_logger.log_step(task="info_text", layer=2, log_text=f"Chunking at {method["level_name"]} level completed in {round(text_end - text_start, 2)} seconds ")

            # Commit evaluation of method
            #if session_evaluator:
                #session_evaluator.commit_evaluation()



        #if i+2 > min(method_limit, len(method_list)): break

        old_chunk_array = new_chunk_array


    pipeline_end = time.time()

    # Commit pipeline evaluation
    if session_evaluator:
        session_evaluator.commit_evaluation()


    # After all chunking iterations, we introduce the latest new_chunks into the "Paragraphs" table with all recorded level IDs
    session_logger.log_step(task="info_text", layer=2, log_text=f"Completed chunking in {round(pipeline_end - pipeline_start, 2)} seconds")


    # First delete previous occurrences of this doc in the table
    await Paragraph.delete_data({"user_id": user_id, "doc_id": doc_id}, db)

    #session_logger.log_step(task="table", layer=1, log_text=f"Inserting following data into the Paragraphs table", table_data=new_chunk_array)

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


"""
async def run_chunking_old(pipelines: dict[str, list[dict[str, Any]]], user_id: UUID, doc_id: UUID, db: AsyncSession):

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
    #session_logger.log_step(task="info_text", log_text=f"Sorted pipelines look like this: {sorted_pipelines}")
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

"""