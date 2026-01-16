import json
import asyncio
from typing import Any, Dict, List, Optional, Iterable
import re
import pandas as pd

import os
import time

# Orchestrators
from app.rag_apis.docling_api import DoclingClient, DoclingOutputType
from app.rag_apis.image2caption_api import MultiModalVisionClient
from app.rag_apis.chat_api import ChatOrchestrator


# Docling

from docling_core.transforms.chunker.hybrid_chunker import HybridChunker
from docling_core.transforms.chunker.tokenizer.base import BaseTokenizer
from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer
from transformers import AutoTokenizer
from docling_core.transforms.chunker.base import BaseChunk
from docling_core.transforms.chunker.hierarchical_chunker import DocChunk, HierarchicalChunker


from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
)
from docling.document_converter import DocumentConverter, PdfFormatOption

#loggs
from app.log_generator import InfoLogger


# Database ops
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Doc, Paragraph, Retrieval



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











class TableConverter:

    """
    treats tables as paragraphs
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.table_lines = [] # stores all table positions
        self.table_paragraph = "" # stores paragraph from previous iterations
        self.convert_tables = True # set by parent
        self.logger = InfoLogger(__name__) # set by parent
        

    def scan_paragraphs(self, lines: List[str]):

        table_lines = set()

        in_table = False

        for i, line in enumerate(lines):
            stripped = line.strip()

            if not in_table:
                if stripped.startswith("|"):
                    in_table = True
                    table_lines.add(i)
            else:
                if stripped == "":
                    in_table = False
                else:
                    table_lines.add(i)

        self.table_lines = table_lines




    def explain_table_content(self, input_table):

        """
        Explains table content with paragraphs describing it
        """

        system_prompt = """
                        You are an assistant that must always respond in valid JSON following this schema:

                        {   
                            "title": "Output",
                            "description": "Structured Output",
                            "type": "object",
                            "properties": {
                                "Output": {
                                    "title": "Output",
                                    "description": "A detailed transcription of the Markdown Table into readable text",
                                    "type": "string"
                                }
                            }   
                        }   

                """

        user_prompt = f"""
                    Analyze the content of following TABLE and generate the specified transcription. 

                    TABLE:
                    ---
                    {input_table}

                    """

        chat_orchestrator = ChatOrchestrator()

        start = time.time()
        output_dict = json.loads(chat_orchestrator.call("thinker", system_prompt, user_prompt))
        end = time.time()

        #print("printing Chat Output: ", output_dict)

        # start logging

        self.logger.log_step(task="validate", log_text="Explain Table Content",
                             inputs=input_table, outputs=output_dict["Output"], duration=f"{round(end - start, 2)} seconds")
        # end logging

        return output_dict["Output"]


    def process_tables(self, i, line, output_text):


        if i in self.table_lines:
            print(f"[DEBUG] Paragraph {i} is inside table → skipping \n")
            print(f"[DEBUG] It goes like this: {line}")
            # update actual paragraph for next iteration
            self.table_paragraph += line
            return True

        if self.table_paragraph:
            
            if self.convert_tables:
                # process table into readable text
                output_text = self.explain_table_content(self.table_paragraph)
                for line in output_text.split("\n"):
                    output_text += f"{line}[PARA_SEP]"
    
            else:
                output_text += f"{self.table_paragraph}[PARA_SEP]"
    
            self.table_paragraph = ""


        return False




    def process_last_table(self, output_text):
        if self.table_paragraph:

            if self.convert_tables:
                # process table into readable text
                output_text = self.explain_table_content(self.table_paragraph)
                for line in output_text.split("\n"):
                    output_text += f"{line}[PARA_SEP]"

            else:
                output_text += f"{self.table_paragraph}[PARA_SEP]"









class ImageConverter:

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.image_dict = {}
        self.image_id = 0

    def filter_image_content(self, input_chunk):

        """
                Rewrites image content with paragraphs describing it - if it aligns with the main topic of the file. Otherwise, it removes it.
                Should remove descriptions of logos and layout symbols
        """

        system_prompt = """
                        You are an assistant that must always respond in valid JSON following this schema:

                        {   
                            "title": "Json",
                            "description": "Structured Json",
                            "type": "object",
                            "properties": {
                                "Boolean": {
                                    "title": "Boolean",
                                    "description": "A boolean that is False if the specified chunk corresponds to a document's layout rather than its main content, and True otherwise",
                                    "type": "Boolean"
                                }
                            }   
                        }   

                """

        user_prompt = f"""
                    Analyze the content of following CHUNK and generate the specified Boolean. 

                    CHUNK:
                    ---
                    {input_chunk}
                    
                    """

        chat_orchestrator = ChatOrchestrator()

        output_dict = json.loads(chat_orchestrator.call("thinker", system_prompt, user_prompt))

        print("printing Chat Boolean Output: ", output_dict)



        return output_dict["Boolean"]



    def rewrite_image_content(self, input_chunk):

        """
        Explains table content with paragraphs describing it
        """

        system_prompt = """
                        You are an assistant that must always respond in valid JSON following this schema:

                        {   
                            "title": "Output",
                            "description": "Structured Output",
                            "type": "object",
                            "properties": {
                                "Output": {
                                    "title": "Output",
                                    "description": "A fluent transcription of this text chunk",
                                    "type": "string"
                                }
                            }   
                        }   

                """

        user_prompt = f"""
                    Analyze the content of following CHUNK and generate the specified transcription. 

                    CHUNK:
                    ---
                    {input_chunk}

                    """

        chat_orchestrator = ChatOrchestrator()

        start = time.time()
        output_dict = json.loads(chat_orchestrator.call("thinker", system_prompt, user_prompt))
        end = time.time()

        #print("printing Chat Output: ", output_dict)

        self.logger.log_step(task="validate", log_text="Rewrite Image Content",
                             inputs=input_chunk, outputs=output_dict["Output"],
                             duration=f"{round(end - start, 2)} seconds")

        return output_dict["Output"]


    async def convert_images(self, images):






        image_df = pd.DataFrame(images)
        image_dict = {}
        client = MultiModalVisionClient()

        for _, row in image_df.iterrows():

            start = time.time()
            response = await client.describe(row['image'], question="Describe the main object and its text captions in detail.", label="vision_only")
            end = time.time()

            #print("Response:\n", response)



            pattern = r"\*\*Main Object:\*\*(.*?)\*\*Text Captions:\*\*"
            match = re.search(pattern, response, flags=re.DOTALL)
            if match:
                content = match.group(1).strip()




                is_relevant = self.filter_image_content(content)
                if is_relevant:
                    self.logger.log_step(task="validate", log_text="Generate Image Content", outputs=content,
                                         duration=f"{round(end - start, 2)} seconds")


                    image_dict[row['filename']] = self.rewrite_image_content(content)


        self.image_dict = image_dict




    def process_images(self, line, output_text):




        def replace_with_dict(match):
            key = match.group(0)  # the full matched string, e.g. "picture-1.png"

            image_caption = self.image_dict.get(key, "") # fallback to "" if not found


            return image_caption

        if line.endswith(".png"):



            image_text = re.sub(r"picture-\d+\.png", replace_with_dict, line)

            for line in image_text.split("\n"):

                output_text += (f"{line}[PARA_SEP]")




class BaseConverter:

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, input_path: str, output_path: str):
        super().__init__(db, logger, user_id, doc_id, input_path)

        self.db = db
        self.logger = logger
        self.user_id = user_id
        self.doc_id = doc_id
        self.input_path = input_path
        self.output_path = output_path

        self.paragraph_df = pd.DataFrame()



    async def run_conversion(self) -> None:
        # First, check if there is any Doc_ID in the  "Docs" table that doesn't have a paragraphs table.
        # Then, run the docling client and process the markdown text



        self.logger.log_step(log_text="processing markdown")

        output_text = await self.convert_file(self.input_path)

        with open(self.output_path, "w", encoding="utf-8") as f:
            f.write(output_text)





class CustomConverter(BaseConverter, ImageConverter, TableConverter):

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, input_path: str, output_path: str, doc_id: int = 0,
                 do_ocr: bool = True, tables: str = "convert"):
        super().__init__(db, logger, user_id, doc_id, input_path, output_path)

        self.doc_id = doc_id

        self.do_ocr = do_ocr

        # --- TABLE LOGIC ---
        self.keep_tables = False
        self.convert_tables = False
        if tables == "keep":
            self.keep_tables = True
        elif tables == "convert":
            self.keep_tables = True
            self.convert_tables = True
        # --------------------





    async def convert_file(self, input_path: str):

        #

        client = DoclingClient()

        result = await client.convert(
            file_path=input_path,
            response_type=DoclingOutputType.MARKDOWN,
            extract_tables_as_images=False,
        )

        md_text = result.get("markdown", "")
        images = result.get("images", [])




        # convert images or delete the references
        if self.do_ocr:
            asyncio.run(self.convert_images(images))

        else:
            before = len(md_text)
            md_text = re.sub(r"picture-\d+\.png", "", md_text)

            after = len(md_text)

            md_text = re.sub(r"\n{3,}", "\n\n", md_text)

            self.logger.log_step(log_text=f"removed images, going from {before} lines to {after} lines")

        lines = md_text.split("\n")
        # search tables, if the required chunker is provided

        if self.keep_tables:
            self.scan_paragraphs(lines)

        # initialize the paragraph_dict. If no chunkers are provided it will only store paragraphs and record their section_id

        output_text = ""

        # create new tables for this document, if they don't exist

        # start processing paragraphs

        for i, line in enumerate(lines):

            line = line.strip()
            if not line:
                continue

            # process images
            if self.do_ocr:
                self.process_images(line, output_text)
                continue

            # process tables
            if self.keep_tables:

                is_table = self.process_tables(i, line, output_text)
                if is_table:
                    continue

            output_text += f"{line}[PARA_SEP]"

        # In case that the last paragraph still belongs to a table, save this table
        if self.keep_tables:
            self.process_last_table(output_text)


        return output_text








class DoclingConverter(BaseConverter):
    """
    Base Docling Method for Hierarchical and Hybrid variants

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id, doc_id: UUID,
                 input_path: str, output_path: str, do_ocr=True, do_tables=True):

        super().__init__(db, logger, user_id, doc_id, input_path, output_path)


        self.do_ocr = do_ocr
        self.do_table_structure = do_tables

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

        dl_doc = doc_converter.convert(source=input_path).document

        return dl_doc.export_to_markdown()





# ---------------------------------------------

# ----------------CHUNKERS --------------------

# ---------------------------------------------


class BaseChunker:
    
    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, level_name: str, do_title: bool):


        self.db = db
        self.logger = logger
        self.user_id = user_id
        self.doc_id = doc_id

        self.level = level_name # name of the new level to be created
        self.level_id = 1
        self.do_title = do_title

        self.paragraph_df = pd.DataFrame()

    async def run_doc_chunking(self, input_path: str):

        # loggs
        self.logger.log_step(task="debug", log_text=f"Processing document {self.doc_id}")
        # -----


        doc_title = os.path.basename(input_path).split(".")[0]
        await Retrieval.insert_data( data_dict={"level": self.level, "level_id": self.level_id, "user_id": self.user_id, 
                                            "doc_id": self.doc_id, "title": doc_title}, db=self.db)

        with open(input_path, "r", encoding="utf-8") as f:
            md_text = f.read()


        # This dict will contain all metadata for the final insert in the "Paragraphs" table
        meta_dict = {"paragraph": md_text, "doc_id": self.doc_id}

        # call chunk_text method normally,
        meta_list = await self.run_text_chunking(meta_dict)

        return meta_list

    async def run_text_chunking(self, meta_dict: Dict[str, Any])-> List[Dict[str, Any]]:

        input_chunk = meta_dict.pop("paragraph")
        # now meta_dict holds only the parent level IDs

        # method of the child class
        output_chunks = self.chunk_text(input_chunk)

        # each item will correspond to a chunk, its level_id plus meta_dict
        meta_list = []
        for chunk in output_chunks:

            title = ""
            if self.do_title:
                title, chunk = chunk.split("\n", 1)


            await Retrieval.insert_data(data_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.level, "level_id": self.level_id, "title": title, "content": chunk}, db=self.db)

            meta_list.append(meta_dict | {"paragraph": chunk, f"{self.level}_id": self.level_id})

            self.level_id += 1

        await self.db.commit()

        return meta_list






from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer
from transformers import AutoTokenizer


class ParagraphChunker(BaseChunker):

    """
    Requirements: "chunk_text" method with the specified input and output data types

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, level_name: str,
                 do_title: bool, separator: str = "##", tokenizer_model: str = "", max_tokens: int = 0):

        super().__init__(db, logger, user_id, doc_id, level_name, do_title)


        self.tokenizer = ""
        self.model = tokenizer_model

        self.max_tokens = max_tokens
        self.separator = separator

    def compute_paragraph_length(self, paragraph):

        """
        if tokenizer_model is empty, paragraph length will be computed as the number of characters
        if max_tokens is empty, the max tokens of tokenizer_model will be used
        if both are empty, this ParagraphChunker is equivalent to regex chunking
        """
        if not self.model and not self.max_tokens:
            return 1 # ensures that len(paragraph) > max_tokens

        elif not self.model:
            return len(paragraph)


        # if tokenizer_model was given with no max_tokens

        elif not self.tokenizer:
            self.tokenizer = self.compute_tokenizer(self.model, self.max_tokens)

        length = self.tokenizer.count_tokens(paragraph)
        return length


    @staticmethod
    def compute_tokenizer(model: str, max_tokens: int = 512):
        if model:
            hf_tok = AutoTokenizer.from_pretrained(model)
            if not max_tokens:
                max_tokens = hf_tok.model_max_length
            tokenizer: BaseTokenizer = HuggingFaceTokenizer(tokenizer=hf_tok, max_tokens=max_tokens)
        else:
            tokenizer = ""

        return tokenizer


    def chunk_text(self, input_chunk: str) -> List[str]:
        paragraphs = input_chunk.split(self.separator)
        chunks = []
        current = []
        current_len = 0



        for p in paragraphs:
            p = p.strip()
            if not p:
                continue

            p_len = self.compute_paragraph_length(p)
            if current_len + p_len > self.max_tokens:
                chunks.append(f"{self.separator}".join(current))
                current = [p]
                current_len = p_len
            else:
                current.append(p)
                current_len += p_len

        if current:
            chunks.append(f"{self.separator}".join(current))

        return chunks




# ----------- SLIDING WINDOW --------------

def sliding_window(text, tokenizer, max_tokens=512, overlap=128):
    tokens = tokenizer.get_tokenizer().encode(text)
    chunks = []
    start = 0

    while start < len(tokens):
        end = start + max_tokens
        chunk_tokens = tokens[start:end]
        chunk_text = tokenizer.get_tokenizer().decode(chunk_tokens)
        chunks.append(chunk_text)
        start += max_tokens - overlap

    return chunks





class DoclingChunker(BaseChunker):
    """
    Base Docling Method for Hierarchical and Hybrid variants

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id, doc_ids: Optional[Iterable[int]] = (),
                 do_ocr=True, do_tables=True):

        super().__init__(db, logger, user_id, doc_id)

        self.doc_ids = doc_ids
        self.doc_id = 0

        self.do_ocr = do_ocr
        self.do_table_structure = do_tables

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

        doc = doc_converter.convert(source=input_path).document

        return doc

    async def chunk_doc(self, doc, chunker):
        chunk_iter = chunker.chunk(dl_doc=doc)
        chunks = list(chunk_iter)

        title = ""
        section_id = 0
        for i, chunk in enumerate(chunks):
            embedding_chunk_id = i + 1

            chunk_text = chunker.contextualize(chunk=chunk)
            paragraph_list = chunk_text.split("\n")

            new_title = paragraph_list[0]

            if not section_id or new_title != title:  # must trigger at first iteration

                section_id += 1
                for paragraph in paragraph_list:
                    # self.db.insert(f"Paragraphs_{self.doc_id}", {"doc_id": self.doc_id, "section_id": section_id, "embedding_chunk_id": embedding_chunk_id, "paragraph": f"{paragraph}\n"})

                    paragraph_dict = {"user_id": self.user_id, "doc_id": self.doc_id, "section_id": section_id,
                                      "embedding_chunk_id": embedding_chunk_id, "paragraph": f"{paragraph}\n"}

                    await Paragraph.insert_data(paragraph_dict, self.db)


            else:  # don't store the new title, as it's the same from the previous chunk

                for paragraph in paragraph_list[1:]:
                    paragraph_dict = {"user_id": self.user_id, "doc_id": self.doc_id, "section_id": section_id,
                                      "embedding_chunk_id": embedding_chunk_id, "paragraph": f"{paragraph}\n"}

                    await Paragraph.insert_data(paragraph_dict, self.db)

            title = new_title

        await self.db.commit()
        
        

    async def _index_with_chunker(self, chunker):

        self.logger.log_step(task="debug", log_text=f"processing document {self.doc_id}")

        # read processed markdown
        doc_dir = await self.get_document_dir()
        processed_markdown_path = os.path.join(doc_dir, "processed_markdown.md")
        with open(processed_markdown_path, "r", encoding="utf-8") as f:
            md_text = f.read()

        # chunk markdown and store paragraphs and @indexing data into Paragraphs_"doc_id" table
    
        await self.chunk_doc(md_text, chunker)

        await self.export_to_retrievals()
            
            






class HierarchicalDoclingChunker(DoclingChunker):

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, do_ocr: bool, do_tables: bool, max_tokens_subsection, min_tokens_subsection, overlap_subsection, merge_across_blocks_subsection, doc_ids: Optional[Iterable[int]] = ()):
        super().__init__(db, logger, user_id, doc_id, doc_ids, do_ocr, do_tables)

        self.max_tokens = max_tokens_subsection
        self.min_tokens = min_tokens_subsection
        self.overlap = overlap_subsection
        self.merge_across_blocks = merge_across_blocks_subsection

    def _initialize_chunker(self):
        chunker = HierarchicalChunker(
            max_tokens=self.max_tokens,
            min_tokens=self.min_tokens,
            overlap=self.overlap,
            merge_across_blocks=self.merge_across_blocks,
        )
        return chunker

    async def run_indexing(self):
        chunker = self._initialize_chunker()
        await self._index_with_chunker(chunker)






class HybridDoclingChunker(DoclingChunker):

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_id: UUID, do_ocr: bool, do_tables: bool, embedding_model_subsection: str):
        super().__init__(db, logger, user_id, doc_id, doc_ids, do_ocr, do_tables)
        self.embedding_model = embedding_model_subsection

    def _initialize_chunker(self):
        tokenizer: BaseTokenizer = HuggingFaceTokenizer(tokenizer=AutoTokenizer.from_pretrained(self.embedding_model))
        chunker = HybridChunker(tokenizer=tokenizer)

        return chunker

    async def run_indexing(self):
        chunker = self._initialize_chunker()
        await self._index_with_chunker(chunker)








# Run Conversion

CONVERSION_TYPE_MAPPER = {
    "Docling": DoclingConverter,
    "Custom": CustomConverter,
}


async def run_indexing(indexer_dict: Dict[str, Any], user_id: UUID, doc_id: UUID, db: AsyncSession):
    rows, columns = await Doc.get_all({"user_id": user_id, "doc_id": doc_id}, db)
    document_df = pd.DataFrame(rows, columns=columns)
    input_path = document_df["path"].iloc[0]
    output_path = os.path.join(os.path.dirname(input_path), "processed_markdown.md")



    indexer_dict["db"] = db
    indexer_dict["user_id"] = user_id
    indexer_dict["doc_id"] = doc_id
    indexer_dict["input_path"] = input_path
    indexer_dict["output_path"] = output_path
    indexer_dict["logger"] = InfoLogger()

    indexer_type = indexer_dict.pop("type")
    indexer = CONVERSION_TYPE_MAPPER[indexer_type](**indexer_dict)

    await indexer.run_indexing()





# Run Chunking

CHUNKING_TYPE_MAPPER = {
    "Docling Hierarchical": HierarchicalIndexer,
    "Docling Hybrid": HybridIndexer,
    "Custom": CustomConverter,
}



async def run_chunking(method_list: list[dict[str, Any]], user_id: UUID, doc_id: UUID, db: AsyncSession):
    rows, columns = await Doc.get_all({"user_id": user_id, "doc_id": doc_id}, db)
    document_df = pd.DataFrame(rows, columns=columns)
    source_path = document_df["path"].iloc[0]
    input_path = os.path.join(os.path.dirname(source_path), "processed_markdown.md")


    # LIMIT Chunking iterations
    method_limit = 2

    # Delete previous occurrences of this doc in the "Retrievals" table
    await Retrieval.delete_data({"user_id": user_id, "doc_id": doc_id}, db)
    
    async def generate_offspring(input_chunks):
        output_chunks = []
        for input_chunk in input_chunks:

            new_chunks = await method_instance.run_text_chunking(input_chunk)
            output_chunks += new_chunks

        return output_chunks
    
    
    first_method = method_list.pop(0)
    method_type = first_method.pop("type")
    
    method_instance = CHUNKING_TYPE_MAPPER[method_type](**first_method)

    # apply first chunker to the document at this path
    old_chunk_array = await method_instance.run_doc_chunking(input_path)

    
    for i, method in enumerate(method_list):
        # New Chunking Method
        method["db"] = db
        method["user_id"] = user_id
        method["doc_id"] = doc_id
        method["logger"] = InfoLogger()
        method_type = method.pop("type")

        # Instance new method
        method_instance = CHUNKING_TYPE_MAPPER[method_type](**method)
        
        # Generate offspring based on past generation
        new_chunk_array = await generate_offspring(old_chunk_array)


        if i+2 > min(method_limit, len(method_list)): break
        
        old_chunk_array = new_chunk_array
        
    # Now we introduce new_chunks into the "Paragraphs" table with all recorded level IDs

    # First delete previous occurrences of this doc in the table
    await Paragraph.delete_data({"user_id": user_id, "doc_id": doc_id}, db)

    for chunk_dict in new_chunk_array:
        await Paragraph.insert_data(data_dict=chunk_dict, db=db)


    # Finally we label this doc as "chunked"
    await Doc.update_data(data_dict={"indexed": 1}, where_dict={"user_id": user_id, "doc_id": doc_id},
                          db=db)
            
        
            















# Levels


async def load_indexing_levels(user_id: UUID, doc_id: UUID, db: AsyncSession)-> List[str]:



    rows, columns = await Retrieval.get_all(where_dict={"user_id": user_id, "doc_id": doc_id}, db=db)
    retrieval_df = pd.DataFrame(rows, columns=columns)

    indexed_levels = list(set(retrieval_df["level"]))

    return indexed_levels



# Results


async def load_indexing_results(user_id: UUID, doc_id: UUID, db: AsyncSession)-> List[Dict[str, Any]]:



    rows, columns = await Retrieval.get_all(where_dict={"user_id": user_id, "doc_id": doc_id}, db=db)
    retrieval_df = pd.DataFrame(rows, columns=columns)

    indexed_levels = list(set(retrieval_df["level"]))

    output_list = []
    for level in indexed_levels:
        level_mask = retrieval_df["level"] == level
        item_list = retrieval_df.loc[level_mask, ["retrieval_id", "title", "content"]].to_dict(orient="records")

        output_list.append({"level": level, "items": item_list})

    return output_list




async def update_indexing_results(user_id: UUID, db: AsyncSession, result_list: List[Dict[str, Any]]):


    df0 = pd.DataFrame(result_list).explode("items", ignore_index=True)
    df = df0.drop(columns=["items"]).join(pd.json_normalize(df0["items"]))

    input_list = df.to_dict(orient="records")

    for row in input_list:
        # we only need to add the user_id, as row already contains the pk "retrieval_id"
        row["user_id"] = user_id
        data_dict = {"content": row.pop("content")}

        await Retrieval.update_data(data_dict=data_dict, where_dict=row, db=db)