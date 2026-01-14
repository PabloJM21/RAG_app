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












class EmbeddingChunker:


    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID):
        super().__init__(db, logger, user_id)

        self.chunk_record = {}



    def update_initial_dict(self, paragraph_dict: Dict, min_chars_embedding_chunk: int):
        # THRESHOLD SECTIONS

        # update paragraph_dict keys
        paragraph_dict[f"embedding_chunk_id"] = 1  # these ids are 1 until the chunk length overpasses the limit


        self.logger.log_step(log_text=f"Defined Embedding Chunk with {min_chars_embedding_chunk} characters")

        self.chunk_record = {"length": 0, "limit": min_chars_embedding_chunk}

        # end logg



    def update_dict(self, paragraph_dict, lines):
        # Check for new levels based on threshold


        if paragraph_dict["embedding_chunk_id"] and self.chunk_record["length"] > self.chunk_record["limit"]:


            # logg
            self.logger.log_step(task="debug", log_text=f"Also starting new embedding_chunk, as the previous one consists of {self.chunk_record["length"]} characters")
            # end logg

            paragraph_dict[f"embedding_chunk_id"] += 1
            self.chunk_record["length"] = 0



    def update_chunk_length(self, line):

        # update chunk length with current paragraph

        self.chunk_record["length"] += len(line)




    







class TableChunker:

    """
    treats tables as paragraphs
    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID):
        super().__init__(db, logger, user_id)


        self.table_lines = []
        self.table_paragraph = ""
        self.table_id = 0
        

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


    def process_tables(self, i, current_paragraph, paragraph_list):


        if i in self.table_lines:
            print(f"[DEBUG] Paragraph {i} is inside table → skipping \n")
            print(f"[DEBUG] It goes like this: {current_paragraph}")
            # update actual paragraph for next iteration
            self.table_paragraph += current_paragraph
            return True

        if self.table_paragraph:


            # process table into readable text

            output_text = self.explain_table_content(self.table_paragraph)
            for line in output_text.split("\n"):
                paragraph_list.append(f"{line}\n")

            self.table_paragraph = ""


        return False




    def process_last_table(self, paragraph_list):
        if self.table_paragraph:

            # process table into readable text

            output_text = self.explain_table_content(self.table_paragraph)
            for line in output_text.split("\n"):
                paragraph_list.append(f"{line}\n")









class ImageChunker:

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID):
        super().__init__(db, logger, user_id)

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






    def process_images(self, line, paragraph_list):




        def replace_with_dict(match):
            key = match.group(0)  # the full matched string, e.g. "picture-1.png"

            image_caption = self.image_dict.get(key, "") # fallback to "" if not found


            return image_caption

        if line.endswith(".png"):



            output_text = re.sub(r"picture-\d+\.png", replace_with_dict, line)
            for line in output_text.split("\n"):

                paragraph_list.append(f"{line}\n")





class BaseIndexer:
    
    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID):
        super().__init__(db, logger, user_id)

        self.db = db
        self.user_id = user_id
        self.logger = logger

        self.doc_id = 0
        self.do_embedding_chunks = True
        self.paragraph_df = pd.DataFrame()
        


    
    def check_hierarchy(self, child, parent):


        chunk_ids = list(set(self.paragraph_df[f"{child}_id"]))
        for id_value in chunk_ids:
            if len(set(self.paragraph_df.loc[self.paragraph_df[f"{child}_id"] == id_value, f"{parent}_id"])) > 1:
                return False

        return True



    async def export_level(self, level):
        id_values = list(set(self.paragraph_df[f"{level}_id"]))


        for id_value in id_values:
            filtered_df = self.paragraph_df[self.paragraph_df[f"{level}_id"] == id_value]

            title = filtered_df["paragraph"].iloc[0]
            chunk = "\n".join(filtered_df["paragraph"].iloc[1:])

            # self.db.insert("Retrievals", {"doc_id": self.doc_id, "level": level, "level_id": id_value, "title": title, "content": chunk})

            await Retrieval.insert_data({"user_id": self.user_id, "doc_id": self.doc_id, "level": level, "level_id": id_value, "title": title, "content": chunk},
                                  self.db)

        await self.db.commit()

    async def export_parent_and_child(self, child, parent):
        parent_ids = list(set(self.paragraph_df[f"{parent}_id"]))

        for id_value in parent_ids:
            filtered_df = self.paragraph_df[self.paragraph_df[f"{parent}_id"] == id_value]
            title = filtered_df["paragraph"].iloc[0]
            filtered_df = filtered_df.iloc[1:].copy()

            child_ids = list(set(filtered_df[f"{child}_id"]))

            for chunk_id in child_ids:
                chunk = "\n".join(
                    filtered_df.loc[filtered_df[f"{child}_id"] == chunk_id, "paragraph"])

                await Retrieval.insert_data(
                    {"user_id": self.user_id, "doc_id": self.doc_id, "level": child, "level_id": chunk_id, "title": title, "content": chunk},
                    self.db)

        await self.db.commit()

    async def export_document_title(self):


        print(f"document input level detected for document {self.doc_id}")

        rows, columns = await Doc.get_all({"user_id": self.user_id, "doc_id": self.doc_id}, self.db)
        document_df = pd.DataFrame(rows, columns=columns)

        if len(document_df) > 1:
            raise Exception("More than one document in this paragraphs table")

        else:
            document_title = os.path.basename(document_df["path"].iloc[0]).split(".")[0]

        

        await Retrieval.insert_data(
            {"user_id": self.user_id, "doc_id": self.doc_id, "level": "document", "level_id": self.doc_id, "title": document_title},
            self.db)

        await self.db.commit()


    async def export_to_retrievals(self):



        # Finally, merge paragraphs data and insert chunks into the RETRIEVALS table (Sections and EmbeddingChunks)

        await Retrieval.delete_data({"user_id": self.user_id, "doc_id": self.doc_id}, self.db)

        rows, columns = await Paragraph.get_all({"user_id": self.user_id, "doc_id": self.doc_id}, self.db)
        
        self.paragraph_df = pd.DataFrame(rows, columns=columns).sort_values(
            by="paragraph_id")  # ensures that paragraphs are in the right order

        # Insert Document title

        await self.export_document_title()
        
        # Insert Sections


        await self.export_level("section")

        # Insert Embedding Chunks 

        
        if self.do_embedding_chunks:
            
            # first check if embedding_chunk_id has 1-to-* relationship with section_id
            if self.check_hierarchy("embedding_chunk", "section"):
                print("section is parent of embedding_chunk")

                await self.export_parent_and_child("embedding_chunk", "section")


            else:
                print("section has NO relationship to embedding_chunk")
                await self.export_level("embedding_chunk")


        
        
        await Doc.update_data(data_dict={"indexed": 1}, where_dict={"user_id": self.user_id, "doc_id": self.doc_id}, db=self.db)




class CustomIndexer(BaseIndexer, ImageChunker, TableChunker, EmbeddingChunker):


    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, doc_ids: Optional[Iterable[int]] = (), new_section: str = "## ", do_ocr = True, do_tables = True, min_chars_embedding_chunk = 0):
        super().__init__(db, logger, user_id)
       


        self.doc_ids = doc_ids
        self.doc_id = 0

        self.do_ocr = do_ocr
        self.table_conversion = do_tables
        self.min_chars_embedding_chunk = min_chars_embedding_chunk
        
        if self.min_chars_embedding_chunk:
            self.do_embedding_chunks = True
        else:
            self.do_embedding_chunks = False
        
        self.new_section =  new_section

        self.output_markdown_path = os.path.join(os.path.abspath("output"), "processed_markdown.md")





    async def convert_pdf(self, path: str) -> (str, Iterable):
        """
        Converts a PDF to markdown via Docling,
        then chunks the markdown according to provided settings.
        """
        client = DoclingClient()

        result = await client.convert(
            file_path=path,
            response_type=DoclingOutputType.MARKDOWN,
            extract_tables_as_images=False,
        )

        markdown_text = result.get("markdown", "")
        images = result.get("images", [])

        return markdown_text, images




    def process_markdown(self, md_text, images):



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

        if self.table_conversion:
            self.scan_paragraphs(lines)

        # initialize the paragraph_dict. If no chunkers are provided it will only store paragraphs and record their section_id

        paragraph_list = []

        # create new tables for this document, if they don't exist




        # start processing paragraphs


        for i, line in enumerate(lines):

            if not line.strip():
                continue

            current_paragraph = line + "\n"

            # process images
            if self.do_ocr:
                self.process_images(line, paragraph_list)
                continue

            # process tables
            if self.table_conversion:

                is_table = self.process_tables(i, line, paragraph_list)
                if is_table:
                    continue

            paragraph_list.append(current_paragraph)



        # In case that the last paragraph still belongs to a table, save this table
        if self.table_conversion:
            self.process_last_table(paragraph_list)



        output_md_text = "".join(paragraph_list)

        with open(self.output_markdown_path, "w", encoding="utf-8") as f:
            f.write(output_md_text)









    async def chunk_markdown(self, md_text):


        await Paragraph.delete_data({"user_id": self.user_id, "doc_id": self.doc_id}, self.db)

        # start processing paragraphs

        lines = md_text.split("\n")

        paragraph_dict = {"doc_id": self.doc_id, "section_id": 0}

        if self.do_embedding_chunks:
            self.update_initial_dict(paragraph_dict, self.min_chars_embedding_chunk)

        for i, line in enumerate(lines):

            if not line.strip():
                continue

            current_paragraph = line + "\n"

            # Check for new section
            if current_paragraph.startswith(self.new_section):  # will trigger at any section

                line = line.strip(self.new_section)
                current_paragraph = current_paragraph.strip(self.new_section)

                # logg
                self.logger.log_step(task="debug", log_text=f"Detected new section with title: {line}")

                # update dict with chunkers
                if self.do_embedding_chunks:
                    self.update_dict(paragraph_dict, line)

                # update section_id
                paragraph_dict["section_id"] += 1

            if paragraph_dict["section_id"]:  # don't store paragraphs before the first section is detected
                paragraph_dict["paragraph"] = current_paragraph
                #paragraph_id = self.db.insert(f"Paragraphs_{self.doc_id}", paragraph_dict)  # update(paragraph_dict)
                await Paragraph.insert_data({"user_id": self.user_id} | paragraph_dict, self.db)

            # update chunk length with current paragraph. Only the ThresholdIndexer implements this method
            if self.do_embedding_chunks:
                self.update_chunk_length(line)

        await self.db.commit()




    async def run_indexing(self) -> None:
        # First, check if there is any Doc_ID in the  "Docs" table that doesn't have a paragraphs table.
        # Then, run the docling client and process the markdown text

        rows, columns = await Doc.get_all({"user_id": self.user_id, "indexed": 0}, self.db)
        new_document_df = pd.DataFrame(rows, columns=columns)

        if self.doc_ids:
            mask = new_document_df["doc_id"].isin(self.doc_ids)
            new_document_df = new_document_df[mask]


        for _, row in  new_document_df.iterrows():

            self.doc_id = int(row["doc_id"])


            self.logger.log_step(task="debug", log_text=f"processing document {self.doc_id}")

            self.logger.log_step(log_text="extracting pdf as markdown")

            md_text, images = await (self.convert_pdf(row["path"]))

            self.logger.log_step(log_text="processing markdown")

            self.process_markdown(md_text, images)

            with open(self.output_markdown_path, "r", encoding="utf-8") as f:
                md_text = f.read()

            # chunk markdown and store paragraphs and @indexing data into Paragraphs_"doc_id" table
            await self.chunk_markdown(md_text)

            # export chunks to Retrievals table
            await self.export_to_retrievals()




class DoclingIndexer(BaseIndexer):

    """
    Base Docling Method for Hierarchical and Hybrid variants

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id, doc_ids: Optional[Iterable[int]] = (), do_ocr=True, do_tables=True):
        
        super().__init__(db, logger, user_id)


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
                    #self.db.insert(f"Paragraphs_{self.doc_id}", {"doc_id": self.doc_id, "section_id": section_id, "embedding_chunk_id": embedding_chunk_id, "paragraph": f"{paragraph}\n"})

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



        # Creates chunks suited for this embedding model without merging sections. Each section is decomposed in one or more of these chunks (allows parent child relationship)

        rows, columns = await Doc.get_all({"user_id": self.user_id, "indexed": 0}, self.db)
        new_document_df = pd.DataFrame(rows, columns=columns)

        if self.doc_ids:
            mask = new_document_df["doc_id"].isin(self.doc_ids)
            new_document_df = new_document_df[mask]


        for _, row in new_document_df.iterrows():
            self.doc_id = int(row["doc_id"])

            self.logger.log_step(task="debug", log_text=f"processing document {self.doc_id}")


            doc = self.convert_file(row["path"])


            await self.chunk_doc(doc, chunker)

            await self.export_to_retrievals()



class HierarchicalIndexer(DoclingIndexer):

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, do_ocr: bool, do_tables: bool, max_tokens_subsection, min_tokens_subsection, overlap_subsection, merge_across_blocks_subsection, doc_ids: Optional[Iterable[int]] = ()):
        super().__init__(db, logger, user_id, doc_ids, do_ocr, do_tables)

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



class HybridIndexer(DoclingIndexer):

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, do_ocr: bool, do_tables: bool, embedding_model_subsection: str, doc_ids: Optional[Iterable[int]] = ()):
        super().__init__(db, logger, user_id, doc_ids, do_ocr, do_tables)
        self.embedding_model = embedding_model_subsection

    def _initialize_chunker(self):
        tokenizer: BaseTokenizer = HuggingFaceTokenizer(tokenizer=AutoTokenizer.from_pretrained(self.embedding_model))
        chunker = HybridChunker(tokenizer=tokenizer)

        return chunker

    async def run_indexing(self):
        chunker = self._initialize_chunker()
        await self._index_with_chunker(chunker)


TYPE_MAPPER = {
    "Docling Hierarchical": HierarchicalIndexer,
    "Docling Hybrid": HybridIndexer,
    "Custom": CustomIndexer,
}





# Run Indexing


async def run_indexing(indexer_dict: Dict[str, Any], user_id: UUID, doc_ids: list[UUID], db: AsyncSession):
    indexer_dict["db"] = db
    indexer_dict["user_id"] = user_id
    indexer_dict["doc_ids"] = doc_ids
    indexer_dict["logger"] = InfoLogger()

    indexer_type = indexer_dict.pop("type")
    indexer = TYPE_MAPPER[indexer_type](**indexer_dict)

    await indexer.run_indexing()



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