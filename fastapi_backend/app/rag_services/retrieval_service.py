import json
import asyncio
from typing import Any, Dict, List, Optional, Iterable
import re
import numpy as np
import pandas as pd
import time
import copy

#fastapi exceptions
from fastapi import APIRouter, Depends, HTTPException, Request

#Orchestrators
from app.rag_apis.chat_api import ChatOrchestrator
from app.rag_apis.embed_api import EmbeddingOrchestrator



# helpers for disc paths
from app.rag_services.helpers import get_doc_paths, get_log_path, get_doc_title, get_user_api_keys, log_pipeline_methods, ExtractionError


#embeddings
from openai import OpenAI



#loggs
from app.log_generator import InfoLogger
from app.generate_markdown import export_logs

# Database ops
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocPipelines, MainPipeline, Paragraph, Retrieval, Embedding





# ---------------------------------------------

# ---------------- GENERATOR --------------------

# ---------------------------------------------



class ChatGenerator:
    """"
    Provides final answer based on retrieval_output and input query

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, generator_model: str, generator_prompt: str, query_transformation_model: str, query_transformation_prompt: Optional[str] = "A new version of this query in the same language, suited for chunk retrieval with LLMs", doc_id: Optional[UUID] = None):
        self.db = db
        self.logger = logger
        self.user_id = user_id
        self.doc_id = doc_id

        self.query_transformation_model = query_transformation_model
        self.query_transformation_prompt = query_transformation_prompt

        self.generator_model = generator_model
        self.generator_prompt = generator_prompt

        self.chat_orchestrator: Optional[ChatOrchestrator] = None



    async def init_chat_client(self):

        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1", db=self.db)

        self.chat_orchestrator = ChatOrchestrator(user_key_list=user_key_list,  base_api="https://chat-ai.academiccloud.de/v1")

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




    async def _process_query(self, query: str) -> str:
        system_prompt = f"""
    You are an assistant that processes text queries.

    Return ONLY valid JSON with exactly this structure:
    {{
      "output": "string"
    }}

    The value of "output" must satisfy this instruction exactly:
    {self.query_transformation_prompt}

    Rules:
    - Use the query as the source.
    - Do not repeat the instruction text.
    - Do not return a schema.
    - Do not return keys other than "output".
    - Do not use markdown code fences.
    - If the query does not contain enough meaningful information to satisfy the instruction, return:
      {{"output": ""}}
    """.strip()

        user_prompt = f"""
    Apply this instruction to the query below:
    {self.query_transformation_prompt}

    Query:
    ---
    {query}
    ---
    """.strip()

        chat_output = self.chat_orchestrator.call(
            label=self.query_transformation_model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        return self.unwrap_answer(chat_output)

    def _generate_content(self, query: str, retrieval_input_chunks: str) -> str:
        system_prompt = f"""
    You are an assistant that processes a user query together with retrieved text chunks.

    Return ONLY valid JSON with exactly this structure:
    {{
      "output": "string"
    }}

    The value of "output" must satisfy this instruction exactly:
    {self.generator_prompt}

    Rules:
    - Use both the query and the provided chunks as the source.
    - Base the answer on the chunks whenever possible.
    - Do not repeat the instruction text.
    - Do not return a schema.
    - Do not return keys other than "output".
    - Do not use markdown code fences.
    - If the query and chunks do not contain enough meaningful information to satisfy the instruction, return:
      {{"output": ""}}
    """.strip()

        user_prompt = f"""
    Apply this instruction to the query and chunks below:
    {self.generator_prompt}

    QUERY:
    ---
    {query}
    ---

    CHUNKS:
    ---
    {retrieval_input_chunks}
    ---
    """.strip()

        chat_output = self.chat_orchestrator.call(
            label=self.generator_model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        return self.unwrap_answer(chat_output)

    async def run_generation(self, query: str, input_chunks: list[str]) -> str:
        await self.init_chat_client()

        if self.query_transformation_model:
            transformed_query = await self._process_query(query)
            if transformed_query:
                query = transformed_query

        retrieval_input_chunks = "\n\n[NEW_CHUNK]\n\n".join(input_chunks)

        output_answer = self._generate_content(query, retrieval_input_chunks)

        return output_answer











# ---------------------------------------------

# ---------------- RETRIEVERS --------------------

# ---------------------------------------------

def rows_to_columns(rows):

    if not rows:
        return {}
    cols = rows[0].keys()
    out = {c: [] for c in cols}
    for row in rows:
        for c in cols:
            out[c].append(row[c])

    return out





async def get_retrieval_content(db: AsyncSession, user_id: UUID, retrieval_ids: Iterable = ()):
    """
    Return a list of content strings for the given retrieval_ids.
    """
    
    where = {"user_id": user_id, "retrieval_id": retrieval_ids}

    retrieval_rows, columns = await Retrieval.get_all(
        columns=["doc_id", "retrieval_id", "content"],
        where_dict=where,
        db=db,
    )

    return rows_to_columns(retrieval_rows)




async def get_level_position(db: AsyncSession, user_id: UUID, doc_id, level: str, retrieval_id):
    where = {"user_id": user_id, "doc_id": doc_id, "level": level}

    retrieval_rows, columns = await Retrieval.get_all(
        columns=["retrieval_id"],
        where_dict=where,
        db=db,
    )

    retrieval_dict = rows_to_columns(retrieval_rows)

    retrieval_ids = retrieval_dict.get("retrieval_id", [])


    # Count how many IDs are <= given retrieval_id
    level_position = sum(int(rid) <= int(retrieval_id) for rid in retrieval_ids)

    return level_position




async def get_chunk_metadata(db: AsyncSession, user_id: UUID, retrieval_ids: Iterable = ()):

    where = {"user_id": user_id, "retrieval_id": retrieval_ids}

    output_rows, _ = await Retrieval.get_all(
        columns=["doc_id", "retrieval_id", "level", "content"],
        where_dict=where,
        db=db,
    )

    table_data = {"Chunk": [], "Document": [], "Level": [], "Number": []}

    for row in output_rows:
        table_data["Chunk"].append(row["content"])
        table_data["Level"].append(row["level"])

        doc_id = row["doc_id"]
        doc_title = await get_doc_title(user_id, doc_id, db=db)
        table_data["Document"].append(doc_title)

        retrieval_id, level = row["retrieval_id"], row["level"]
        level_position = await get_level_position(db, user_id, doc_id, level, retrieval_id)
        table_data["Number"].append(level_position)

    return table_data


class BaseRetriever:
    def __init__(
        self,
        db: AsyncSession,
        logger: InfoLogger,
        user_id: UUID,
        level: str,
        retrieval_amount,
        query_transformation_model: str,
        query_transformation_prompt: str,
        doc_id: UUID = None,
    ):
        self.db = db
        self.logger = logger
        self.user_id = user_id
        self.doc_id = doc_id
        self.level = level
        self.k = int(retrieval_amount) if retrieval_amount else 0

        self.transformation_model = query_transformation_model
        self.query_transformation_prompt = query_transformation_prompt

        self.chat_orchestrator: Optional[ChatOrchestrator] = None

    # ---------------------------------------------------------
    # Internal helpers
    # ---------------------------------------------------------



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




    async def init_chat_client(self):

        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1", db=self.db)

        self.chat_orchestrator = ChatOrchestrator(user_key_list=user_key_list,  base_api="https://chat-ai.academiccloud.de/v1")





    async def _find_source_data(self, filter_ids: Iterable = ()):
        """
        Given a set of retrieval_ids, determine the originating document
        and the level_ids that correspond to the next retrieval stage.
        """

        retrieval_rows, columns = await Retrieval.get_all(
            columns=["level", "level_id"],
            where_dict={
                "user_id": self.user_id,
                "retrieval_id": filter_ids,
            },
            db=self.db,
        )

        retrieval_dict = rows_to_columns(retrieval_rows)

        # Extract filter level and IDs
        filter_level = str(retrieval_dict["level"][0])
        filter_level_ids = list(set(retrieval_dict["level_id"]))

        # Fetch paragraphs belonging to this doc + level
        paragraph_rows, columns = await Paragraph.get_all_paragraphs(
            columns=[f"{self.level}_id"],
            where_dict={
                "user_id": self.user_id,
                "doc_id": self.doc_id,
                f"{filter_level}_id": filter_level_ids,
            },
            db=self.db,
        )

        # Extract next-level ids
        level_ids = rows_to_columns(paragraph_rows)[f"{self.level}_id"]

        return level_ids



    async def filter_retrieval_content(self, retrieval_ids: Optional[Iterable] = ()):

        columns = ["retrieval_id", "content"]
        
        # Reranker
        if self.level == "rerank":
            # the reranker child class is running retrieval
            if retrieval_ids:
                where = {"user_id": self.user_id, "retrieval_id": retrieval_ids}

            # the reranker child class is running embeddings
            elif self.doc_id:
                where = {"user_id": self.user_id, "doc_id": self.doc_id, "level": self.level}


            # the reranker child class belongs to the reranker of the main_pipeline, or to the router (impossible), and running embeddings
            else:
                return {}
            
            
            
        # Not Reranker
        else:
            # if this retriever is not the router and retrieval_ids exist for filtering. In this case the child class is running retrieval.
            if retrieval_ids and self.doc_id:
                level_ids = await self._find_source_data(retrieval_ids)

                where = {
                    "user_id": self.user_id,
                    "doc_id": self.doc_id,
                    "level_id": level_ids,
                    "level": self.level,
                }


            # if this retriever is not the router but there are no filter_ids.
            # This can happen in two scenarios:
            # 1. the child class is running retrieval and there is no router.
            # 2. the child class is running embeddings.
            elif self.doc_id:
                where = {
                    "user_id": self.user_id,
                    "doc_id": self.doc_id,
                    "level": self.level,
                }

            # if this retriever is the router and there are filter_ids. Never happens
            elif retrieval_ids:
                return {}


            # if this retriever is the router and there are no filter_ids.
            # This can happen in two scenarios:
            # 1. the child class is running retrieval.
            # 2. the child class is running embeddings.
            else:
                where = {
                    "user_id": self.user_id,
                    "level": self.level,
                }

                # we need the doc_id to decide which pipelines to run next
                columns = ["doc_id", "retrieval_id", "content"]



        retrieval_rows, columns = await Retrieval.get_all(
            columns=columns,
            where_dict=where,
            db=self.db,
        )



        return rows_to_columns(retrieval_rows)
            
                
            
            
        



    async def process_query(self, query: str) -> str:
        # Qwen3-Coder is explicitly an instruction-tuned coder model, so its usage profile lines up with OpenAIs mini line

        system_prompt = f"""
        You are an assistant that processes text chunks.

        Return ONLY valid JSON with exactly this structure:
        {{
          "output": "string"
        }}

        The value of "output" must satisfy this instruction exactly:
        {self.query_transformation_prompt}

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
        Apply this instruction to the query below:
        {self.query_transformation_prompt}

        Query:
        ---
        {query}
        ---
        """.strip()

        chat_output = self.chat_orchestrator.call(
            label=self.transformation_model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        return self.unwrap_answer(chat_output)



    async def run_retrieval(self, query: str, filter_ids: Optional[Iterable] = ()) -> Dict[str, List]:

        # first of all instance chat orchestrator
        await self.init_chat_client()

        # first process query if required
        if self.transformation_model:
            self.logger.log_step(task="info_text", layer=1, log_text=f"Starting query transformation")

            input_query = query
            query = await self.process_query(query)


            self.logger.log_step(task="table", layer=1, log_text="Query transformed successfully: ", table_data={"Input Query":input_query , "Output Query": query})



        retrieval_dict = await self.filter_retrieval_content(filter_ids)


        self.logger.log_step(task="table", layer=1, table_data={"Candidate chunks": retrieval_dict["content"]})

        # call to child method
        #self.logger.log_step(task="info_text", layer=1, log_text=f"Input dict:\n{retrieval_dict}")

        retrieval_output_ids = await self.run_retriever(query, retrieval_dict)


        if not retrieval_output_ids:
            self.logger.log_step(task="info_text", layer=2, log_text=f"Retriever returned zero chunks!")
            return {}

        self.logger.log_step(task="info_text", layer=2, log_text=f"Retrieved {len(retrieval_output_ids)} out of {len(retrieval_dict["retrieval_id"])} Chunks")


        output_dict = await get_retrieval_content(self.db, self.user_id, retrieval_output_ids)

        #output_dict = {"retrieval_id": retrieval_output_ids, "content": retrieval_content["content"]}

        self.logger.log_step(task="table", layer=1, table_data={"Retrieved chunks": output_dict["content"]})

        #self.logger.log_step(task="info_text", layer=1, log_text=f"Output IDs:\n{retrieval_output_ids}")
        # output_dict = {"retrieval_id": retrieval_output_dict["retrieval_id"]}


        # add doc_ids to the dict, in case of the router
        #if not self.doc_id and not self.level == "rerank":
            #self.update_output_dict(retrieval_dict, output_dict)

        return output_dict






# Requirement for new Retriever classes: "run_retriever" method with the specified input and output types




class ReasonerRetriever(BaseRetriever):
    """"
    Provides retrieval_output that aligns best with the raw input query

    retrieval_output should ideally consist of small content (like title + small summary)

    To create an instance of the class, provide the level at which the retrieval will take place
    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, level: str, retrieval_amount: int, reasoner_model: str, query_transformation_model: str, query_transformation_prompt: Optional[str] = "A new version of this query in the same language, suited for chunk retrieval with LLMs", doc_id: Optional[UUID] = None):

        super().__init__(db=db, logger=logger, user_id=user_id, doc_id=doc_id, level=level, retrieval_amount=retrieval_amount, query_transformation_model=query_transformation_model, query_transformation_prompt=query_transformation_prompt)


        self.reasoner_model = reasoner_model

    @staticmethod
    def unwrap_retrieval_ids(chat_output) -> List[str]:
        """
        Accept only a real JSON object with an actual retrieval_ids field.
        """

        if not isinstance(chat_output, str):
            raise ExtractionError(
                f"Invalid response type (expected string): {type(chat_output)}",
                status_code=422,
            )

        try:
            data = json.loads(chat_output)
        except json.JSONDecodeError:
            raise ExtractionError(
                f"Response is not valid JSON: {chat_output[:200]}",
                status_code=422,
            )

        if not isinstance(data, dict):
            raise ExtractionError(
                "Response JSON is not an object",
                status_code=422,
            )

        retrieval_ids = data.get("retrieval_ids")

        if not isinstance(retrieval_ids, list):
            raise ExtractionError(
                "No valid 'retrieval_ids' field found (expected list)",
                status_code=422,
            )

        output_ids = []
        for item in retrieval_ids:
            if isinstance(item, str) and item.strip():
                output_ids.append(item.strip())

        """
        if not output_ids:
            raise ExtractionError(
                f"'retrieval_ids' list is empty or invalid: {retrieval_ids}",
                status_code=422,
            )
        """

        return output_ids





    def _retrieve_ids(self, query: str, retrieval_input_chunks: str) -> List[str]:
        # Qwen3-Coder is explicitly an instruction-tuned coder model, so its usage profile lines up with OpenAIs mini line

        # QWEN2.5_CODER_32B_INSTRUCT
        if self.k:
            retrieval_rule = f'Return exactly {self.k} chunk IDs in "retrieval_ids".'
        else:
            retrieval_rule = (
                'Return only the chunk IDs that are genuinely useful for the query. '
                'Do not pad the list with weak matches.'
            )

        system_prompt = f"""
    You are an assistant that selects relevant chunk IDs for a query.

    Return ONLY valid JSON with exactly this structure:
    {{
      "retrieval_ids": ["string"]
    }}

    Rules:
    - Use the query and the provided chunks as the source.
    - Each item in "retrieval_ids" must be a CHUNK_ID taken exactly from the provided input.
    - Do not return a schema.
    - Do not return keys other than "retrieval_ids".
    - Do not use markdown code fences.
    - {retrieval_rule}
    - If none of the chunks are relevant, return:
      {{"retrieval_ids": []}}
    """.strip()

        user_prompt = f"""
    Select the most relevant CHUNK_ID values for the query below.

    QUERY:
    ---
    {query}
    ---

    CHUNKS:
    ---
    {retrieval_input_chunks}
    ---
    """.strip()

        # chat orchestrator already instanced by BaseRetriever
        chat_output = self.chat_orchestrator.call(
            label=self.reasoner_model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        output_ids = self.unwrap_retrieval_ids(chat_output)


        return output_ids



    async def run_retriever(self, query: str, retrieval_dict: dict):
        retrieval_input_chunks = ""
        for retrieval_id, content in zip(retrieval_dict["retrieval_id"], retrieval_dict["content"]):
            retrieval_input_chunks += f"CHUNK_ID={retrieval_id}\n{content}\n\n"

        retrieval_output_ids = self._retrieve_ids(query, retrieval_input_chunks)

        # content_mask = [i in retrieval_output_ids for i in retrieval_dict["retrieval_id"]]
        # output_dict = {"retrieval_id": retrieval_output_ids, "content": retrieval_dict["content"][content_mask]}

        return retrieval_output_ids






class EmbeddingRetriever(BaseRetriever):
    """
    Contains all functionality to generate embeddings of a query and retrieval_input, and provide retrieval_output based on cosine similarity.

    Also outputs retrieval IDs, and can take retrieval IDs as input from previous level for targeted retrieval. In iterative retrieving (retriever_1 - retriever_2 ...) only the retrieval IDs are needed for the next iteration.

    To create an instance of the class, provide the level at which the retrieval will take place, plus the embedding model.

    Provides two methods: generate_embeddings, similarity_search
    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, level: str, retrieval_amount: int, embedding_model: str, query_transformation_model: str, query_transformation_prompt: Optional[str] = "A new version of this query in the same language, suited for chunk retrieval with LLMs", doc_id: Optional[UUID] = None):

        super().__init__(db=db, logger=logger, user_id=user_id, doc_id=doc_id, level=level, retrieval_amount=retrieval_amount, query_transformation_model=query_transformation_model, query_transformation_prompt=query_transformation_prompt)  # modern Python 3 style, no super(EmbeddingRetriever, self)


        # self.client = OpenAI()
        self.embedding_model = embedding_model

        self.embedding_orchestrator: Optional[EmbeddingOrchestrator] = None



    # ============================================================
    # INTERNAL HELPERS
    # ============================================================

    async def init_embedding_client(self):

        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1", db=self.db)

        self.embedding_orchestrator = EmbeddingOrchestrator(user_key_list=user_key_list,  base_api="https://chat-ai.academiccloud.de/v1")





    async def _embed(self, texts):

        embeddings = await self.embedding_orchestrator.get_embedding(texts, label=self.embedding_model)  # embeddings

        return embeddings

    async def generate_embeddings(self, filter_ids: Optional[Iterable] = ()) -> None:

        # filter_ids are always empty, since embeddings are generated before retrieval

        # Delete previous embeddings of this doc and level in the "Embeddings" table
        await Embedding.delete_data(where_dict={"user_id": self.user_id, "doc_id": self.doc_id, "level": self.level}, db=self.db)

        # initialize embedding orchestrator
        await self.init_embedding_client()



        #self.logger.log_step(log_text=f"Embedding the retrieval input of each {self.level}")

        retrieval_dict = await self.filter_retrieval_content(filter_ids)


        # Additional Deleting of possible matches of the retrieval_ids with other documents
        for retrieval_id in retrieval_dict["retrieval_id"]:
            await Embedding.delete_data(where_dict={"user_id": self.user_id, "retrieval_id": retrieval_id}, db=self.db)



        # Embed the retrieval input content asynchronously
        async def embed_columns(input_dict):

            embeddings = await self._embed(input_dict["content"])

            embeddings = [np.array(e, dtype=np.float32).tobytes() for e in embeddings]

            output_list = [{"user_id": self.user_id, "retrieval_id": input_dict["retrieval_id"][i], "embedding": embeddings[i]} for i in range(len(embeddings))]

            return output_list

        retrieval_list = await embed_columns(retrieval_dict)


        for insert_dict in retrieval_list:
            await Embedding.insert_data(data_dict=insert_dict, db=self.db)

        await self.db.commit()




    async def run_retriever(self, query: str, retrieval_dict: dict):

        if not self.k:
            self.k = 1


        # initialize embedding orchestrator
        await self.init_embedding_client()

        # 3. Load embeddings for these IDs, if they exist

        retrieval_ids = retrieval_dict["retrieval_id"]

        embedding_rows, columns = await Embedding.get_all(columns=["embedding_id", "retrieval_id", "embedding"], where_dict={"user_id": self.user_id, "retrieval_id": retrieval_ids}, db=self.db)

        embedding_columns = rows_to_columns(embedding_rows)


        # 4. Compute cosine similarity using the static method


        # Convert BLOBs back to float32 vectors
        vectors = [np.frombuffer(b, dtype=np.float32) for b in embedding_columns["embedding"]]

        # Make a matrix shaped (N, dim)
        emb_matrix = np.vstack(vectors)

        # Embed the query
        query_embedding = np.array((await self._embed([query]))[0], dtype="float32")

        # compute score
        embedding_columns["cosine_similarity"] = self._cosine_similarity(query_embedding, emb_matrix)

        # 5. Sort top-k
        top_k_embedding_columns = self.top_k_numpy(embedding_columns, "cosine_similarity", self.k)


        #  6. Return retrieval_ids
        return top_k_embedding_columns["retrieval_id"]




    @staticmethod
    def _cosine_similarity(query_embedding, emb_matrix):
        """
        Compute cosine similarity between a single query vector and a matrix of embeddings.

        Parameters:
            query_embedding : np.ndarray, shape (d,)
            emb_matrix : np.ndarray, shape (n, d)

        Returns:
            sims : np.ndarray, shape (n,)
        """
        query_norm = np.linalg.norm(query_embedding)
        emb_norms = np.linalg.norm(emb_matrix, axis=1)
        sims = (emb_matrix @ query_embedding) / (emb_norms * query_norm)
        return sims

    @staticmethod
    def top_k_numpy(col_dict, sort_col, k):

        #values = np.array(col_dict[sort_col]) # convert to np array

        values = col_dict[sort_col]  # already np.ndarray

        # Partition to get top-k unsorted
        idx = np.argpartition(values, -k)[-k:]

        # Now sort only those k
        sorted_idx = idx[np.argsort(values[idx])[::-1]]

        return {
            col: np.array(col_dict[col])[sorted_idx].tolist()
            for col in col_dict
        }





import math
from collections import Counter, defaultdict

class BM25Retriever(BaseRetriever):

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, level: str, retrieval_amount: int, query_transformation_model: str, query_transformation_prompt: str, doc_id: UUID, k1: str, b: str):

        super().__init__(db=db, logger=logger, user_id=user_id, doc_id=doc_id, level=level, retrieval_amount=retrieval_amount, query_transformation_model=query_transformation_model, query_transformation_prompt=query_transformation_prompt)

        self.k1 = self._safe_float(k1, "k1")
        self.b = self._safe_float(b, "b")



    @staticmethod
    def _safe_float(value: str, name: str) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=422,
                detail=f"Invalid value for '{name}'. Must be a number, got: {value!r}"
            )


    def _tokenize(self, text: str):
        # simple whitespace + punctuation tokenizer
        text = text.lower()
        return re.findall(r"\b\w+\b", text)

    async def run_retriever(self, query: str, retrieval_dict: dict):
        """
        Args:
            query (str)
            retrieval_dict (dict):
                {
                    "retrieval_id": [id1, id2, ...],
                    "content": [chunk1, chunk2, ...]
                }

        Returns:
            List of retrieval_id values for top-k retrieved chunks.
        """

        retrieval_ids = retrieval_dict["retrieval_id"]
        documents = retrieval_dict["content"]
        #assert len(retrieval_ids) == len(documents), "Input lists must be same length"

        # ---- Tokenize documents ----
        tokenized_docs = [self._tokenize(doc) for doc in documents]
        doc_lengths = [len(doc) for doc in tokenized_docs]
        avgdl = sum(doc_lengths) / len(doc_lengths)

        # ---- Compute term frequencies ----
        tf = [Counter(doc) for doc in tokenized_docs]

        # ---- Compute document frequencies ----
        df = defaultdict(int)
        for doc in tokenized_docs:
            for term in set(doc):
                df[term] += 1

        N = len(documents)

        # ---- Compute IDF ----
        idf = {}
        for term, freq in df.items():
            idf[term] = math.log(1 + (N - freq + 0.5) / (freq + 0.5))

        # ---- Score documents for query ----
        query_tokens = self._tokenize(query)
        scores = []

        for i, doc_tf in enumerate(tf):
            score = 0.0
            dl = doc_lengths[i]

            for term in query_tokens:
                if term not in doc_tf:
                    continue

                freq = doc_tf[term]
                numerator = freq * (self.k1 + 1)
                denominator = freq + self.k1 * (1 - self.b + self.b * dl / avgdl)
                score += idf.get(term, 0) * (numerator / denominator)

            scores.append({"id": retrieval_ids[i], "score": score})

        # ---- Sort & return top-k retrieval_ids ----
        scores.sort(key=lambda x: x["score"], reverse=True)
        top_ids = [entry["id"] for entry in scores[:self.k]]

        return top_ids





# ============================================================
# RUN Retrieval
# ============================================================






TYPE_MAPPER = {
    "ReasonerRetriever": ReasonerRetriever,
    "EmbeddingRetriever": EmbeddingRetriever,
    "BM25Retriever": BM25Retriever,
    "Generator": ChatGenerator,
}

def method_not_empty(input_method: Dict[str, Any]):
    if not input_method:
        return False

    if "level" not in input_method:
        return False

    if not input_method["level"]:
        return False
    return True



def pipeline_not_empty(input_pipeline: list[dict[str, Any]]):
    for input_method in input_pipeline:
        if not method_not_empty(input_method):
            return False
    return True

def generator_not_empty(input_method: Dict[str, Any]):
    if not input_method:
        return False

    if "generator_model" not in input_method:
        return False

    if not input_method["generator_model"]:
        return False
    return True



async def run_retrieval(query: str, retrieval_dict: Dict[str, Any], user_id: UUID, db: AsyncSession):


    log_path = await get_log_path(user_id, stage="retrieval")
    session_logger = InfoLogger(log_path=log_path, stage="retrieval")


    # init main pipeline methods
    generator_method = retrieval_dict.pop("generator")
    generator_method.pop("color", None)
    if not generator_not_empty(generator_method):
        return "", []

    router_method = retrieval_dict.pop("router")
    router_method.pop("color", None)
    reranker_method = retrieval_dict.pop("reranker")
    reranker_method.pop("color", None)


    # Logg Retrieval Start
    session_logger.log_step(task="header_1", layer=2, log_text="Starting Retrieval")

    # --- RERANKING -----


    # with router
    if router_method and method_not_empty(router_method):
        # log

        session_logger.log_step(task="header_2", layer=2, log_text=f"Starting Router")
        session_logger.log_step(task="table", layer=2, log_text=f"Method description ", table_data=router_method)

        router_type = router_method.pop("type")
        router_method.update({"logger": session_logger, "user_id": user_id, "db": db})
        router_instance = TYPE_MAPPER[router_type](**router_method)


        router_dict = await router_instance.run_retrieval(query=query)

        if not router_dict:
            return None

        # logg chunks
        #session_logger.log_step(task="table", layer=1, table_data={"Retrieved chunks": router_dict["content"]})




        # ========== Logg ==============
        # get doc_ids of the retrieved chunks and their doc titles for logging
        doc_ids = list(set(router_dict["doc_id"]))
        doc_title_dict = {}
        for doc_id in doc_ids:
            doc_title_dict[doc_id] = await get_doc_title(user_id, doc_id, db=db)

        table_data = {"Chunk": [], "Document": []}
        for doc_id, chunk in zip(router_dict["doc_id"], router_dict["content"]):
            table_data["Chunk"].append(chunk)
            table_data["Document"].append(doc_title_dict[doc_id])

        session_logger.log_step(task="table", layer=2, log_text="Retrieved Chunks: ", table_data=table_data)



        # ========== Doc Pipelines ==============

        input_ids = router_dict["retrieval_id"]

        # if document pipelines, compute filter_ids for further retrieval
        if retrieval_dict:
             # order doesn't matter
            output_ids = []
            for doc_id in doc_ids:

                # log start of document retrieval
                session_logger.log_step(task="header_2", layer=2, log_text=f"Processing Document: {doc_title_dict[doc_id]}")


                # get pipeline if it was exported for this doc_id, otherwise []
                doc_pipeline = retrieval_dict[doc_id] if doc_id in retrieval_dict else []

                if doc_pipeline:
                    session_logger.log_step(task="info_text", layer=2, log_text=f"Found Document Pipeline")
                    session_logger.log_step(task="header_2", layer=2, log_text=f"Starting Document Pipeline")
                    log_pipeline_methods(logger=session_logger, input_pipeline=doc_pipeline)

                else:
                    session_logger.log_step(task="info_text", layer=2, log_text=f"Document Pipeline not found")

                # run pipeline
                filter_ids = await run_document_pipeline(query=query, input_ids=input_ids, input_pipeline=doc_pipeline,
                                                         logger=session_logger, user_id=user_id, doc_id=doc_id, db=db)
                # update output_ids
                if filter_ids:
                    output_ids += filter_ids

                if doc_pipeline:
                    session_logger.log_step(task="info_text", layer=2, log_text=f"Finishing Document Pipeline")

                session_logger.log_step(task="info_text", layer=2, log_text=f"Finishing processing Document")


        # if no document pipelines are found, use IDs provided by router
        else:
            output_ids = input_ids
            session_logger.log_step(task="header_2", layer=2, log_text=f"Processing Documents")
            title_text = ", ".join(doc_title_dict.values())
            session_logger.log_step(task="info_text", layer=2, log_text=f"These documents are: {title_text}")
            session_logger.log_step(task="info_text", layer=2, log_text=f"\nNo Document Pipelines found for any Document")
            session_logger.log_step(task="info_text", layer=2, log_text=f"Finishing processing Document")




    # w/o router
    elif retrieval_dict:
        output_ids = []
        # run all exported pipelines with no input IDs
        for doc_id, doc_pipeline in retrieval_dict.items():

            # log start of document retrieval
            doc_title = await get_doc_title(user_id, doc_id, db=db)

            session_logger.log_step(task="header_2", layer=2, log_text=f"Starting Document Pipeline for Document: {doc_title}")
            log_pipeline_methods(logger=session_logger, input_pipeline=doc_pipeline)

            filter_ids = await run_document_pipeline(query=query, input_ids=[], input_pipeline=doc_pipeline,
                                                         logger=session_logger, user_id=user_id, doc_id=doc_id, db=db)

            if filter_ids:
                output_ids += filter_ids

            session_logger.log_step(task="info_text", layer=2, log_text=f"Finishing Document Pipeline")




    # if there is no router and no document pipelines
    else:
        output_ids = []

    # --- RERANKING -----



    if reranker_method and method_not_empty(reranker_method):
        session_logger.log_step(task="header_2", layer=2, log_text=f"Starting Master Reranker")
        session_logger.log_step(task="table", layer=2, log_text=f"Method description: ", table_data=reranker_method)


        reranker_type = reranker_method.pop("type")
        reranker_method.update({"logger": session_logger, "user_id": user_id, "db": db, "level": "rerank"})
        reranker_instance = TYPE_MAPPER[reranker_type](**reranker_method)
        reranker_dict = await reranker_instance.run_retrieval(query=query, filter_ids=output_ids)

        if not reranker_dict:
            return None

        # logg chunks
        #session_logger.log_step(task="table", layer=1, table_data={"Chunks after reranking": reranker_dict["content"]})

        output_ids = reranker_dict["retrieval_id"]


    # --- GENERATION -----

    session_logger.log_step(task="header_2", layer=2, log_text=f"Starting Generator")
    session_logger.log_step(task="table", layer=2, log_text=f"Method description: ", table_data=generator_method)


    metadata= await get_chunk_metadata(db, user_id, output_ids)


    #session_logger.log_step(task="table", layer=2, log_text="Following chunks will be used: ", table_data={"Sources": chunk_list})

    # pass chunks and query to generator
    generator_type = generator_method.pop("type")
    generator_method.update({"logger": session_logger, "user_id": user_id, "db": db})
    generator_instance = TYPE_MAPPER[generator_type](**generator_method)

    session_logger.log_step(task="info_text", layer=1, log_text=f"Starting generator call")
    output_answer = await generator_instance.run_generation(query=query, input_chunks=metadata["Chunk"])
    #session_logger.log_step(task="info_text", layer=1, log_text=f"Finishing generator call. Output answer:\n{output_answer}")

    session_logger.log_step(task="header_2", layer=2, log_text=f"Final Results")


    session_logger.log_step(task="table", layer=2, log_text="Generation concluded successfully obtaining following output: ", table_data={"Query": query, "Output": output_answer})

    session_logger.log_step(task="table", layer=2, log_text="Sources: ", table_data=metadata)


    # Finally we export the logs to md
    await export_logs(log_path)



    return output_answer, metadata["Chunk"]





async def run_document_pipeline(query, input_ids, input_pipeline, logger, user_id, doc_id, db):

    logger.log_step(task="info_text", layer=1, log_text=f"Starting Document Pipeline")
    if input_pipeline:
        pipeline_output_ids = input_ids

        for method in input_pipeline:

            method_type = method.pop("type")

            logger.log_step(task="header_3", layer=2, log_text=f"Starting {method["level"]} retrieval with {method_type}")

            logger.log_step(task="table", layer=1, log_text=f"Method description: ", table_data=method)


            method.update({"logger": logger, "user_id": user_id, "doc_id": doc_id, "db": db})
            method_instance = TYPE_MAPPER[method_type](**method)



            pipeline_output_dict = await method_instance.run_retrieval(query=query, filter_ids=pipeline_output_ids)



            # stop pipeline if any retriever returns no IDs
            if not pipeline_output_dict:

                return None

            pipeline_output_ids = pipeline_output_dict["retrieval_id"]

            # logg chunks








            #logger.log_step(task="info_text", layer=1, log_text=f"Output size: {len(pipeline_output_ids)} Chunks")

    #if no pipeline was exported for this doc, just filter the input ids
    else:

        retrieval_rows, _ = await Retrieval.get_all(
            columns=["retrieval_id"],
            where_dict={"user_id": user_id, "retrieval_id": input_ids, "doc_id": doc_id},
            db=db,
        )
        pipeline_output_ids = [row["retrieval_id"] for row in retrieval_rows]



    return pipeline_output_ids






# ============================================================
# RUN Export, Embeddings
# ============================================================

EMBEDDING_TYPE_MAPPER = {
    "EmbeddingRetriever": EmbeddingRetriever,
}

async def run_embeddings(method_list: list[dict[str, Any]], user_id: UUID, doc_id: UUID, db: AsyncSession):
    log_path = await get_log_path(user_id, stage="retrieval")
    session_logger = InfoLogger(log_path=log_path, stage="retrieval")

    # logg
    doc_title = await get_doc_title(user_id, doc_id, db=db)
    session_logger.log_step(task="header_1", layer=2, log_text=f"Generating Embeddings for document: {doc_title}")
    log_pipeline_methods(session_logger, method_list)

    for method in method_list:


        method_type = method.pop("type")
        method.update({"logger": session_logger, "user_id": user_id, "doc_id": doc_id, "db": db})


        method_instance = EMBEDDING_TYPE_MAPPER[method_type](**method)
        await method_instance.generate_embeddings()



    # Finally we export the logs to md
    await export_logs(log_path)







async def run_doc_embeddings(retrieval_pipeline, user_id, doc_id, db: AsyncSession):

    if not pipeline_not_empty(retrieval_pipeline):
        return False


    # We run embeddings if needed
    embedding_methods = [
        copy.deepcopy(method)
        for method in retrieval_pipeline
        if method["type"] == "EmbeddingRetriever"
    ]

    if embedding_methods:
        await run_embeddings(embedding_methods, user_id, doc_id, db)

    return True










# ============================================================
# New approach
# ============================================================


"""
async def run_document_pipeline(input_ids, method_list, logger, user_id, doc_id, db):

    logger.log_step(task="info_text", layer=1, log_text=f"Logging document_pipeline")

    query = method_list.pop("query")[0]

    if method_list:
        pipeline_output_ids = input_ids
        for method in method_list:
            logger.log_step(task="table", layer=1, log_text=f"Starting with method: ", table_data=method)

            method_type = method.pop("type")
            method.update({"logger": logger, "user_id": user_id, "doc_id": doc_id, "db": db})
            method_instance = TYPE_MAPPER[method_type](**method)

            pipeline_output_dict = await method_instance.run_retrieval(query=query, filter_ids=pipeline_output_ids)
            pipeline_output_ids = pipeline_output_dict["retrieval_id"]

            logger.log_step(task="info_text", layer=1, log_text=f"Retrieved {len(pipeline_output_ids)} Chunks")

    #if no pipeline was exported for this doc, just filter the input ids
    else:

        retrieval_rows, _ = await Retrieval.get_all(
            columns=["retrieval_id"],
            where_dict={"user_id": user_id, "retrieval_id": input_ids, "doc_id": doc_id},
            db=db,
        )
        pipeline_output_ids = [row["retrieval_id"] for row in retrieval_rows]



    return pipeline_output_ids




async def run_retrieval(query: str, pipelines: dict[str, Any], user_id: UUID, doc_id: UUID, db: AsyncSession):
    log_path = await get_log_path(user_id, stage="retrieval")
    session_logger = InfoLogger(log_path=log_path, stage="retrieval")
    doc_title = await get_doc_title(user_id, doc_id, db=db)
    session_logger.log_step(task="header_1", layer=2, log_text=f"Starting Retrieval for document: {doc_title}")

    evaluator_args = {"user_id": user_id, "doc_id": doc_id, "db": db, "logger": session_logger}
    runner_args = {"user_id": user_id, "doc_id": doc_id, "db": db, "session_logger": session_logger}

    pipelines.update({"query": query})

    await evaluation_wrapper(pipelines=pipelines, evaluator_args=evaluator_args, runner_args=runner_args,
                             session_logger=session_logger, log_path=log_path, runner_fn=run_document_pipeline)

    # init main pipeline methods
    router_method = pipelines.pop("router")
    reranker_method = pipelines.pop("reranker")
    generator_method = pipelines.pop("generator")

    # Logg Retrieval Start
    session_logger.log_step(task="header_1", layer=2, log_text="Starting Retrieval")

    # --- RERANKING -----

    # with router
    if router_method:
        # log

        session_logger.log_step(task="header_2", layer=2, log_text=f"Starting Routing Pipeline")
        session_logger.log_step(task="table", layer=2, log_text=f"This Pipeline consists of following method: ",
                                table_data=router_method)

        router_type = router_method.pop("type")
        router_method.update({"logger": session_logger, "user_id": user_id, "db": db})
        router_instance = TYPE_MAPPER[router_type](**router_method)

        router_dict = await router_instance.run_retrieval(query=query)

        session_logger.log_step(task="info_text", layer=2, log_text=f"Finishing Routing Pipeline")

        input_ids = router_dict["retrieval_id"]

        # Get doc_ids of the retrieved chunks and their doc titles for logging
        doc_ids = list(set(router_dict["doc_id"]))
        doc_title_dict = {}
        for doc_id in doc_ids:
            doc_title_dict[doc_id] = await get_doc_title(user_id, doc_id, db=db)

        # if any document pipeline, compute filter_ids for further retrieval


        if any_pipeline:
            # order doesn't matter
            output_ids = []
            for doc_id in doc_ids:

                # log start of document retrieval
                session_logger.log_step(task="header_2", layer=2,
                                        log_text=f"Processing Document: {doc_title_dict[doc_id]}")

                # get pipeline if it was exported for this doc_id, otherwise []
                doc_pipeline = retrieval_dict[doc_id] if doc_id in retrieval_dict else []

                if doc_pipeline:
                    session_logger.log_step(task="info_text", layer=2, log_text=f"Found Document Pipeline")
                    session_logger.log_step(task="header_2", layer=2, log_text=f"Starting Document Pipeline")
                    log_pipeline_methods(logger=session_logger, input_pipeline=doc_pipeline)

                else:
                    session_logger.log_step(task="info_text", layer=2, log_text=f"Document Pipeline not found")

                # run pipeline
                filter_ids = await run_document_pipeline(query=query, input_ids=input_ids, input_pipeline=doc_pipeline,
                                                         logger=session_logger, user_id=user_id, doc_id=doc_id, db=db)
                # update output_ids
                output_ids += filter_ids

                if doc_pipeline:
                    session_logger.log_step(task="info_text", layer=2, log_text=f"Finishing Document Pipeline")

                session_logger.log_step(task="info_text", layer=2, log_text=f"Finishing processing Document")


        # if not document retriever, use ids provided by router
        else:
            output_ids = input_ids
            session_logger.log_step(task="header_2", layer=2, log_text=f"Processing Documents")
            title_text = ", ".join(doc_title_dict.values())
            session_logger.log_step(task="info_text", layer=2, log_text=f"These documents are: {title_text}")
            session_logger.log_step(task="info_text", layer=2,
                                    log_text=f"\nNo Document Pipelines found for any Document")
            session_logger.log_step(task="info_text", layer=2, log_text=f"Finishing processing Document")




    # w/o router
    elif retrieval_dict:
        output_ids = []
        # run all exported pipelines with no input IDs
        for doc_id, doc_pipeline in retrieval_dict.items():
            # log start of document retrieval
            doc_title = await get_doc_title(user_id, doc_id, db=db)

            session_logger.log_step(task="header_2", layer=2,
                                    log_text=f"Starting Document Pipeline for Document: {doc_title}")
            log_pipeline_methods(logger=session_logger, input_pipeline=doc_pipeline)

            filter_ids = await run_document_pipeline(query=query, input_ids=[], input_pipeline=doc_pipeline,
                                                     logger=session_logger, user_id=user_id, doc_id=doc_id, db=db)

            output_ids += filter_ids

            session_logger.log_step(task="info_text", layer=2, log_text=f"Finishing Document Pipeline")




    # if there is no router and no document pipelines
    else:
        output_ids = []

    # --- RERANKING -----

    if reranker_method:
        session_logger.log_step(task="header_2", layer=2, log_text=f"Starting Reranker Pipeline")
        session_logger.log_step(task="table", layer=2, log_text=f"This Pipeline consists of following method: ",
                                table_data=reranker_method)

        reranker_type = reranker_method.pop("type")
        reranker_method.update({"logger": session_logger, "user_id": user_id, "db": db, "level": "rerank"})
        reranker_instance = TYPE_MAPPER[reranker_type](**reranker_method)
        reranker_dict = await reranker_instance.run_retrieval(query=query, filter_ids=output_ids)
        output_ids = reranker_dict["retrieval_id"]

    # --- GENERATION -----

    session_logger.log_step(task="header_2", layer=2, log_text=f"Starting Generation Pipeline")
    session_logger.log_step(task="table", layer=2, log_text=f"This Pipeline consists of following method: ",
                            table_data=generator_method)

    output_content = await get_retrieval_content(user_id=user_id, retrieval_ids=output_ids, db=db)
    chunk_list = output_content["content"]

    # pass chunks and query to generator
    generator_type = generator_method.pop("type")
    generator_method.update({"logger": session_logger, "user_id": user_id, "db": db})
    generator_instance = TYPE_MAPPER[generator_type](**generator_method)
    output_answer = await generator_instance.run_generation(query=query, input_chunks=chunk_list)

    # Finally we export the logs to md
    await export_logs(log_path)

    return output_answer, chunk_list





async def run_doc_embeddings(retrieval_pipeline: dict[str, list[dict[str, Any]]], user_id, doc_id, db: AsyncSession):
    retrieval_pipeline.pop("evaluator", None)
    sorted_items = sorted(list(retrieval_pipeline.items()), key=lambda x: int(x[0].strip()))
    sorted_pipelines = [x[1] for x in sorted_items if x[1]]
    pipeline = sorted_pipelines[0]

    # We run embeddings if needed
    embedding_methods = [
        copy.deepcopy(method)
        for method in pipeline
        if method["type"] == "EmbeddingRetriever"
    ]

    if embedding_methods:
        await run_embeddings(embedding_methods, user_id, doc_id, db)

"""

