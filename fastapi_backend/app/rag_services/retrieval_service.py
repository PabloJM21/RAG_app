import json
import asyncio
from typing import Any, Dict, List, Optional, Iterable
import re
import time
import copy
import struct

#fastapi exceptions
from fastapi import APIRouter, Depends, HTTPException, Request

#Orchestrators
from app.rag_apis.chat_api import ChatOrchestrator
from app.rag_apis.embed_api import EmbeddingOrchestrator



# External helpers
from app.rag_services.helpers import load_doc_pipelines, load_pipeline, get_doc_paths, get_log_path, get_doc_title, get_user_api_keys, log_pipeline_methods, ExtractionError



#loggs
from app.log_generator import InfoLogger
from app.generate_markdown import export_logs

# Database ops
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import ProjectData, SavedProjects, DocPipelines, MainPipeline, Paragraph, Retrieval, Embedding, Settings





# ---------------------------------------------

# ---------------- GENERATOR --------------------

# ---------------------------------------------

def is_json(s: str) -> bool:
    try:
        json.loads(s)
        return True
    except json.JSONDecodeError:
        return False

class ChatGenerator:
    """"
    Provides final answer based on retrieval_output and input query

    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, generator_model: str, generator_prompt: str, query_transformation_model: str, query_transformation_prompt: Optional[str] = "A new version of this query in the same language, suited for chunk retrieval with LLMs"):
        self.db = db
        self.logger = logger
        self.user_id = user_id

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

    The value of "output" must satisfy the instruction exactly.

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

        if is_json(chat_output):
            chat_output = self.unwrap_answer(chat_output)

        return chat_output

    def _generate_content(self, query: str, history: list[dict[str, Any]], retrieval_input_chunks: str) -> str:
        system_prompt = f"""
    You are an assistant that processes a user query together with retrieved text chunks.

    Return ONLY valid JSON with exactly this structure:
    {{
      "output": "string"
    }}

    The value of "output" must satisfy the instructions exactly.

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

        if history:

            chat_output = self.chat_orchestrator.call_with_history(
                label=self.generator_model,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                history=history,
            )
        else:

            chat_output = self.chat_orchestrator.call(
                label=self.generator_model,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            )

        if is_json(chat_output):
            chat_output = self.unwrap_answer(chat_output)

        return chat_output

    async def run_generation(self, query: str, history: list[dict[str, Any]], input_chunks: list[str]) -> str:
        await self.init_chat_client()

        if self.query_transformation_model:
            transformed_query = await self._process_query(query)
            if transformed_query:
                query = transformed_query

        retrieval_input_chunks = "\n\n[NEW_CHUNK]\n\n".join(input_chunks)

        output_answer = self._generate_content(query, history, retrieval_input_chunks)

        return output_answer






# ====================================================================
# ============================ RETRIEVERS ============================
# ====================================================================



def rows_to_columns(rows):

    if not rows:
        return {}
    cols = rows[0].keys()
    out = {c: [] for c in cols}
    for row in rows:
        for c in cols:
            out[c].append(row[c])

    return out





async def get_retrieval_content(db: AsyncSession, user_id: UUID, project_id: UUID, retrieval_ids: Iterable = ()):
    """
    Return a list of content strings for the given retrieval_ids.
    """
    
    where = {"user_id": user_id, "project_id": project_id, "retrieval_id": retrieval_ids}

    retrieval_rows, columns = await Retrieval.get_all(
        columns=["doc_id", "retrieval_id", "content"],
        where_dict=where,
        db=db,
    )

    return rows_to_columns(retrieval_rows)




async def get_level_position(db: AsyncSession, user_id: UUID, project_id: UUID, doc_id, level: str, retrieval_id):
    where = {"user_id": user_id, "project_id": project_id, "doc_id": doc_id, "level": level}

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




async def get_chunk_metadata(db: AsyncSession, user_id: UUID, project_id: UUID, retrieval_ids: Iterable = ()):

    where = {"user_id": user_id, "project_id": project_id, "retrieval_id": retrieval_ids}

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
        doc_title = await get_doc_title(user_id, project_id, doc_id, db=db)


        table_data["Document"].append(doc_title)

        retrieval_id, level = row["retrieval_id"], row["level"]
        level_position = await get_level_position(db, user_id, project_id, doc_id, level, retrieval_id)
        table_data["Number"].append(level_position)

    return table_data


class BaseRetriever:
    def __init__(
        self,
        db: AsyncSession,
        logger: InfoLogger,
        user_id: UUID,
        project_id: UUID,
        level: str,
        retrieval_amount,
        query_transformation_model: str,
        query_transformation_prompt: str,
        doc_id: UUID = None,
    ):
        self.db = db
        self.logger = logger
        self.user_id = user_id
        self.project_id = project_id
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
                "project_id": self.project_id,
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
                "project_id": self.project_id,
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
                where = {"user_id": self.user_id, "project_id": self.project_id, "retrieval_id": retrieval_ids}

            # the reranker child class is running embeddings
            elif self.doc_id:
                where = {"user_id": self.user_id, "project_id": self.project_id, "doc_id": self.doc_id, "level": self.level}


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
                    "project_id": self.project_id,
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
                    "project_id": self.project_id,
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
                    "project_id": self.project_id,
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

        The value of "output" must satisfy the instruction exactly.

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
        if is_json(chat_output):
            chat_output = self.unwrap_answer(chat_output)
        return chat_output



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


        output_dict = await get_retrieval_content(self.db, self.user_id, self.project_id, retrieval_output_ids)

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

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, project_id: UUID, level: str, retrieval_amount: int, reasoner_model: str, query_transformation_model: str, query_transformation_prompt: Optional[str] = "A new version of this query in the same language, suited for chunk retrieval with LLMs", doc_id: Optional[UUID] = None):

        super().__init__(db=db, logger=logger, user_id=user_id, project_id=project_id, doc_id=doc_id, level=level, retrieval_amount=retrieval_amount, query_transformation_model=query_transformation_model, query_transformation_prompt=query_transformation_prompt)


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

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, project_id: UUID, level: str, retrieval_amount: int, embedding_model: str, query_transformation_model: str, query_transformation_prompt: Optional[str] = "A new version of this query in the same language, suited for chunk retrieval with LLMs", doc_id: Optional[UUID] = None):

        super().__init__(db=db, logger=logger, user_id=user_id, project_id=project_id, doc_id=doc_id, level=level, retrieval_amount=retrieval_amount, query_transformation_model=query_transformation_model, query_transformation_prompt=query_transformation_prompt)  # modern Python 3 style, no super(EmbeddingRetriever, self)


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
        await Embedding.delete_data(where_dict={"user_id": self.user_id, "project_id": self.project_id, "doc_id": self.doc_id, "level": self.level}, db=self.db)

        # initialize embedding orchestrator
        await self.init_embedding_client()



        #self.logger.log_step(log_text=f"Embedding the retrieval input of each {self.level}")

        retrieval_dict = await self.filter_retrieval_content(filter_ids)


        # Additional Deleting of possible matches of the retrieval_ids with other documents
        for retrieval_id in retrieval_dict["retrieval_id"]:
            await Embedding.delete_data(where_dict={"user_id": self.user_id, "project_id": self.project_id, "retrieval_id": retrieval_id}, db=self.db)



        # Embed the retrieval input content asynchronously
        async def embed_columns(input_dict):

            embeddings = await self._embed(input_dict["content"])

            embeddings = [struct.pack(f"{len(e)}f", *e) for e in embeddings]

            output_list = [{"user_id": self.user_id, "project_id": self.project_id, "retrieval_id": input_dict["retrieval_id"][i], "embedding": embeddings[i]} for i in range(len(embeddings))]

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

        embedding_rows, columns = await Embedding.get_all(columns=["embedding_id", "retrieval_id", "embedding"], where_dict={"user_id": self.user_id, "project_id": self.project_id, "retrieval_id": retrieval_ids}, db=self.db)

        embedding_columns = rows_to_columns(embedding_rows)


        # 4. Compute cosine similarity using the static method


        # Convert BLOBs back to float32 vectors

        vectors = [
            list(struct.unpack(f"{len(b) // 4}f", b))
            for b in embedding_columns["embedding"]
        ]

        # Matrix als list-of-lists (kein np.vstack nötig)
        emb_matrix = vectors  # shape: (N, dim) als Python list

        # Query embedding als plain list
        # _embed gibt jetzt list[list[float]] zurück → [0] reicht
        query_embedding = (await self._embed([query]))[0]

        # compute score
        embedding_columns["cosine_similarity"] = self._cosine_similarity(query_embedding, emb_matrix)

        # 5. Sort top-k
        top_k_embedding_columns = self.top_k_numpy(embedding_columns, "cosine_similarity", self.k)


        #  6. Return retrieval_ids
        return top_k_embedding_columns["retrieval_id"]

    @staticmethod
    def _cosine_similarity(query_embedding: list[float], emb_matrix: list[list[float]]) -> list[float]:
        """
        Compute cosine similarity between a single query vector and a matrix of embeddings.

        Parameters:
            query_embedding : list[float], length d
            emb_matrix      : list[list[float]], shape (n, d)

        Returns:
            sims : list[float], length n
        """
        query_norm = math.sqrt(sum(x * x for x in query_embedding))

        sims = []
        for row in emb_matrix:
            dot = sum(a * b for a, b in zip(row, query_embedding))
            row_norm = math.sqrt(sum(x * x for x in row))
            denom = row_norm * query_norm
            sims.append(dot / denom if denom != 0.0 else 0.0)

        return sims



    @staticmethod
    def top_k_numpy(col_dict: dict, sort_col: str, k: int) -> dict:
        values = col_dict[sort_col]  # list[float]

        # Top-k indices sortiert absteigend nach similarity
        sorted_idx = sorted(range(len(values)), key=lambda i: values[i], reverse=True)[:k]

        return {
            col: [col_dict[col][i] for i in sorted_idx]
            for col in col_dict
        }





import math
from collections import Counter, defaultdict

class BM25Retriever(BaseRetriever):

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, project_id: UUID, level: str, retrieval_amount: int, query_transformation_model: str, query_transformation_prompt: str, doc_id: UUID, k1: str, b: str):

        super().__init__(db=db, logger=logger, user_id=user_id, doc_id=doc_id, project_id=project_id, level=level, retrieval_amount=retrieval_amount, query_transformation_model=query_transformation_model, query_transformation_prompt=query_transformation_prompt)

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



# ====================================================================
# ============================ Evaluator ============================
# ====================================================================



class Evaluator:
    
    """"
    Provides final answer based on answer_dict and input query
    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, reasoner_model: str, query_transformation_model: str, query_transformation_prompt: str):


        self.reasoner_model = reasoner_model
        self.db = db
        self.logger = logger
        self.user_id = user_id

        self.transformation_model = query_transformation_model
        self.query_transformation_prompt = query_transformation_prompt

        self.chat_orchestrator: Optional[ChatOrchestrator] = None



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

        if is_json(chat_output):
            chat_output = self.unwrap_answer(chat_output)
        return chat_output




    async def init_chat_client(self):

        user_key_list = await get_user_api_keys(user_id=self.user_id, base_api="https://chat-ai.academiccloud.de/v1", db=self.db)

        self.chat_orchestrator = ChatOrchestrator(user_key_list=user_key_list,  base_api="https://chat-ai.academiccloud.de/v1")


    @staticmethod
    def unwrap_scores(chat_output) -> List[str]:
        """
        Accept only a real JSON object with an actual scores field.
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

        scores = data.get("scores")

        if not isinstance(scores, list):
            raise ExtractionError(
                "No valid 'scores' field found (expected list)",
                status_code=422,
            )

        output_scores = []
        for item in scores:
            try:
                output_scores.append(round(float(item), 2))
            except (TypeError, ValueError):
                pass


        return output_scores



    async def _retrieve_scores(self, query: str, answer_input_chunks: str) -> List[str]:

        system_prompt = f"""
        You are an assistant that scores chunks for a query.

        Return ONLY valid JSON with exactly this structure:
        {{
          "scores": ["float"]
        }}

        Rules:
        - Use the query and the provided chunks as the source.
        - Each item in "scores" must correspond to a chunk from the provided input and follow the same order.
        - Do not return a schema.
        - Do not return keys other than "scores".
        - Do not use markdown code fences.
        """.strip()

        user_prompt = f"""
        Assign scores to the chunks provided for the query below. Each score should be a float in the range 0-10

        QUERY:
        ---
        {query}
        ---

        CHUNKS:
        ---
        {answer_input_chunks}
        ---
        """.strip()

        # chat orchestrator already instanced by BaseRetriever
        chat_output = self.chat_orchestrator.call(
            label=self.reasoner_model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        scores = self.unwrap_scores(chat_output)

        return scores



    async def evaluate_answers(self, query: str, dashboard_dict: dict):

        # first of all instance chat orchestrator
        await self.init_chat_client()

        input_query = query
        # first process query if required
        if self.transformation_model:
            query = await self.process_query(query)

            #self.logger.log_step(task="table", layer=1, log_text="Query transformed successfully: ", table_data={"Input Query":input_query , "Output Query": query})

        # ==================== Calling Evaluator=================
        answer_input_chunks = ""
        i = 1
        project_ids = []
        for project_id, row in dashboard_dict.items():
            project_ids.append(project_id)
            answer_input_chunks += f"Chunk {i}\n{row['answer']}\n\n"
            i += 1

        scores = await self._retrieve_scores(query, answer_input_chunks)

        # =======================================================

        if not (len(scores) == len(project_ids)):
            #self.logger.log_step(task="info_text", layer=2, log_text=f"Evaluator returned incomplete scores!")
            raise ExtractionError(
                "Evaluator returned incomplete 'scores'",
                status_code=422,
            )
        for pid, score in zip(project_ids, scores):
            dashboard_dict[pid]["score"] = score


        return dashboard_dict




# ============================================================
# RUN Retrieval
# ============================================================



# helpers

TYPE_MAPPER = {
    "ReasonerRetriever": ReasonerRetriever,
    "EmbeddingRetriever": EmbeddingRetriever,
    "BM25Retriever": BM25Retriever,
    "Generator": ChatGenerator,
}

def generator_not_empty(input_method: Dict[str, Any]):
    if not input_method:
        return False

    if "generator_model" not in input_method:
        return False

    if not input_method["generator_model"]:
        return False

    if "generator_prompt" not in input_method:
        return False

    if not input_method["generator_model"]:
        return False

    return True



def reranker_or_evaluator_not_empty(input_method: Dict[str, Any]):
    if not input_method:
        return False

    # Check for a key containing "model" with a non-empty value
    has_model = any(
        "model" in key.lower() and value
        for key, value in input_method.items()
    )

    if not has_model:
        return False

    return True



def retriever_not_empty(input_method: Dict[str, Any]):
    if not input_method:
        return False

    if "level" not in input_method:
        return False

    if not input_method["level"]:
        return False

    # Check for a key containing "model" with a non-empty value
    has_model = any(
        "model" in key.lower() and value
        for key, value in input_method.items()
    )

    if not has_model:
        return False

    return True



def retrieval_pipeline_not_empty(input_pipeline: list[dict[str, Any]]):
    for input_method in input_pipeline:
        if not retriever_not_empty(input_method):
            return False
    return True


# retrieval logic


async def run_retrieval(db, user_id, query, history):

    log_path = await get_log_path(user_id, stage="retrieval")
    session_logger = InfoLogger(log_path=log_path, stage="retrieval")

    info_row = await ProjectData.get_row(where_dict={"user_id": user_id}, db=db)

    evaluator_method = load_pipeline(info_row.evaluator)
    if evaluator_method and reranker_or_evaluator_not_empty(evaluator_method):

        # log
        rows, _ = await SavedProjects.get_all(columns=["project_id", "name"], where_dict={"kind": "saved", "user_id": user_id}, db=db)

        dashboard_dict = {}
        p_count = 0
        for row in rows:
            p_count += 1

            start = time.time()
            project_id = row["project_id"]

            output = await get_retrieval_output(db, user_id, project_id, session_logger, query, history)
            end = time.time()

            if output:
                output_answer, metadata = output

                dashboard_dict[project_id] = {
                    "project": str(p_count),
                    "answer": output_answer,
                    "time": round(end - start, 2),
                    "metadata": metadata
                }

        if not dashboard_dict:
            return None

        # run evaluation
        evaluator_method.pop("color", None)
        evaluator_method.update({"logger": session_logger, "user_id": user_id, "db": db})
        evaluator_instance = Evaluator(**evaluator_method)

        #session_logger.log_step(task="header_1", layer=2, log_text=f"Evaluation")
        dashboard_dict = await evaluator_instance.evaluate_answers(query, dashboard_dict)


        # Log final output

        sorted_ids = sorted(dashboard_dict.keys(), key=lambda x: dashboard_dict[x]["score"], reverse=True)
        dashboard_list = [dashboard_dict[pid] for pid in sorted_ids]


        #selected_id = sorted_ids[0]
        #output_answer, metadata = dashboard_dict[selected_id]["answer"], dashboard_dict[selected_id]["metadata"]


        # Finally we export the logs to md
        await export_logs(log_path)
        

        return dashboard_list #output_answer, metadata["Chunk"]

    else:
        project_id = info_row.current_id

        start = time.time()
        output = await get_retrieval_output(db, user_id, project_id, session_logger, query, history)
        end = time.time()

        if output:
            output_answer, metadata = output

            ################## Obtain project number (temporary)

            rows, _ = await SavedProjects.get_all(columns=["project_id", "name"],
                                                  where_dict={"kind": "saved", "user_id": user_id}, db=db)
            project_ids = [row["project_id"] for row in rows]
            p_number = str(project_ids.index(project_id) + 1)

            ###############

            dashboard_list = [{
                "project": p_number,
                "answer": output_answer,
                "time": round(end - start, 2),
                "metadata": metadata
            }]

            session_logger.log_step(task="table", layer=2, log_text="Sources: ", table_data=metadata)

            await export_logs(log_path)

            return dashboard_list #output_answer, metadata["Chunk"]


        # Finally we export the logs to md
        await export_logs(log_path)

        return None




from sqlalchemy import select

async def get_retrieval_output(db, user_id, project_id, session_logger, query, history):
    #session_logger.log_step(task="info_text", layer=2, log_text=f"Requesting project_id {project_id}")


    main_pipeline = await MainPipeline.get_row(where_dict={"user_id": user_id, "project_id": project_id}, db=db)
    #session_logger.log_step(task="info_text", layer=2, log_text=f"Requesting doc_pipelines {main_pipeline.doc_pipelines}")
    router, reranker, doc_pipelines = None, None, None
    if main_pipeline:
        router, reranker, doc_pipelines = main_pipeline.router, main_pipeline.reranker, main_pipeline.doc_pipelines


    settings = await Settings.get_row(where_dict={"user_id": user_id}, db=db)
    generator = None
    if settings:
        generator = settings.generator



    retrieval_dict = load_doc_pipelines(doc_pipelines)

    retrieval_dict.update({
        "router": load_pipeline(router),
        "reranker": load_pipeline(reranker),
        "generator": load_pipeline(generator),
    })

    output = await run_project_retrieval(
        session_logger=session_logger,
        query=query,
        history=history,
        retrieval_dict=retrieval_dict,
        user_id=user_id,
        project_id=project_id,
        db=db,
    )

    return output



async def run_project_retrieval(session_logger, query: str, history: List[Dict[str, Any]], retrieval_dict: Dict[str, Any], user_id: UUID, project_id: UUID, db: AsyncSession):

    # init main pipeline methods
    generator_method = retrieval_dict.pop("generator")
    generator_method.pop("color", None)
    if not generator_not_empty(generator_method):
        return "", []

    router_method = retrieval_dict.pop("router")
    router_method.pop("color", None)
    reranker_method = retrieval_dict.pop("reranker")
    reranker_method.pop("color", None)


    doc_pipeline_data = []

    # with router
    if router_method and retriever_not_empty(router_method):
        # log

        #session_logger.log_step(task="header_3", layer=2, log_text=f"Starting Router")
        #session_logger.log_step(task="table", layer=2, log_text=f"Method description ", table_data=router_method)

        router_type = router_method.pop("type")
        router_method.update({"logger": session_logger, "user_id": user_id, "project_id": project_id, "db": db})
        router_instance = TYPE_MAPPER[router_type](**router_method)

        start = time.time()
        router_dict = await router_instance.run_retrieval(query=query)
        end = time.time()

        session_logger.log_step(task="header_3", layer=1, log_text=f"Document routing")
        session_logger.log_step(task="table", layer=1, table_data={"Method": router_type, "Target level": router_method["level"], "Retrieval amount": len(router_dict["doc_id"]), "Time": round(end - start, 2)})

        if not router_dict:
            return None

        # ========== Logg ==============
        # get doc_ids of the retrieved chunks and their doc titles for logging
        doc_ids = list(set(router_dict["doc_id"]))
        doc_title_dict = {}
        for doc_id in doc_ids:
            doc_title_dict[doc_id] = await get_doc_title(user_id, project_id, doc_id, db=db)

        table_data = {"Chunk": [], "Document": []}
        for doc_id, chunk in zip(router_dict["doc_id"], router_dict["content"]):
            table_data["Chunk"].append(chunk)
            table_data["Document"].append(doc_title_dict[doc_id])

        #session_logger.log_step(task="table", layer=2, log_text="Retrieved Chunks: ", table_data=table_data)

        # ========== Doc Pipelines ==============

        input_ids = router_dict["retrieval_id"]

        # if document pipelines, compute filter_ids for further retrieval
        if retrieval_dict:
             # order doesn't matter
            output_ids = []
            for doc_id in doc_ids:

                # log start of document retrieval
                #session_logger.log_step(task="header_3", layer=2, log_text=f"Processing Document: {doc_title_dict[doc_id]}")

                # get pipeline if it was exported for this doc_id, otherwise []
                doc_pipeline = retrieval_dict[doc_id] if doc_id in retrieval_dict else []
                pipeline_str = ", ".join([method["type"] for method in doc_pipeline])

                #if doc_pipeline:
                    #session_logger.log_step(task="info_text", layer=2, log_text=f"Found Document Pipeline")
                    #session_logger.log_step(task="header_3", layer=2, log_text=f"Starting Document Pipeline")
                    #log_pipeline_methods(logger=session_logger, input_pipeline=doc_pipeline)

                #else:
                    #session_logger.log_step(task="info_text", layer=2, log_text=f"Document Pipeline not found")

                # run pipeline

                start = time.time()
                filter_ids = await run_document_pipeline(query=query, input_ids=input_ids, input_pipeline=doc_pipeline,
                                                         logger=session_logger, user_id=user_id, project_id=project_id, doc_id=doc_id, db=db)
                end = time.time()

                #if doc_pipeline:
                doc_pipeline_data.append({"Document": doc_title_dict[doc_id],
                                             "Pipeline": pipeline_str,
                                             "Target level": doc_pipeline[-1]["level"],
                                             "Retrieval amount": len(filter_ids),
                                             "Time": round(end - start, 2)})

                # update output_ids
                if filter_ids:
                    output_ids += filter_ids

                #if doc_pipeline:
                    #session_logger.log_step(task="info_text", layer=2, log_text=f"Finishing Document Pipeline")

                #session_logger.log_step(task="info_text", layer=2, log_text=f"Finishing processing Document")


        # if no document pipelines are found, use IDs provided by router
        else:
            output_ids = input_ids
            #session_logger.log_step(task="header_3", layer=2, log_text=f"Processing Documents")
            #title_text = ", ".join(doc_title_dict.values())
            #session_logger.log_step(task="info_text", layer=2, log_text=f"These documents are: {title_text}")
            #session_logger.log_step(task="info_text", layer=2, log_text=f"\nNo Document Pipelines found for any Document")
            #session_logger.log_step(task="info_text", layer=2, log_text=f"Finishing processing Document")




    # w/o router
    elif retrieval_dict:
        output_ids = []
        # run all exported pipelines with no input IDs
        for doc_id, doc_pipeline in retrieval_dict.items():
            pipeline_str = ", ".join([method["type"] for method in doc_pipeline])

            # log start of document retrieval
            row = await get_doc_title(user_id, project_id, doc_id, db=db)
            session_logger.log_step(task="info_text", layer=1, log_text=f"Printing DocPipelines row: {row}")
            doc_title = row.name

            #session_logger.log_step(task="header_3", layer=2, log_text=f"Starting Document Pipeline for Document: {doc_title}")
            log_pipeline_methods(logger=session_logger, input_pipeline=doc_pipeline)

            start = time.time()
            filter_ids = await run_document_pipeline(query=query, input_ids=[], input_pipeline=doc_pipeline,
                                                         logger=session_logger, user_id=user_id, project_id=project_id, doc_id=doc_id, db=db)
            end = time.time()

            doc_pipeline_data.append({"Document": doc_title,
                                      "Pipeline": pipeline_str,
                                      "Target level": doc_pipeline[-1]["level"],
                                      "Retrieval amount": len(filter_ids),
                                      "Time": round(end - start, 2)})

            if filter_ids:
                output_ids += filter_ids

            #session_logger.log_step(task="info_text", layer=2, log_text=f"Finishing Document Pipeline")




    # if there is no router and no document pipelines
    else:
        output_ids = []


    # ---- Log --------

    session_logger.log_step(task="header_3", layer=1, log_text=f"Document retrieval")
    session_logger.log_step(task="table", layer=1, table_data=rows_to_columns(doc_pipeline_data))

    # --- RERANKING -----


    if reranker_method and reranker_or_evaluator_not_empty(reranker_method):
        #session_logger.log_step(task="header_3", layer=2, log_text=f"Starting Master Reranker")
        #session_logger.log_step(task="table", layer=2, log_text=f"Method description: ", table_data=reranker_method)


        reranker_type = reranker_method.pop("type")
        reranker_method.update({"logger": session_logger, "user_id": user_id, "project_id": project_id, "db": db, "level": "rerank"})
        reranker_instance = TYPE_MAPPER[reranker_type](**reranker_method)
        reranker_dict = await reranker_instance.run_retrieval(query=query, filter_ids=output_ids)

        if not reranker_dict:
            return None

        output_ids = reranker_dict["retrieval_id"]


    # --- GENERATION -----

    #session_logger.log_step(task="header_3", layer=2, log_text=f"Starting Generator")
    #session_logger.log_step(task="table", layer=2, log_text=f"Method description: ", table_data=generator_method)


    metadata= await get_chunk_metadata(db, user_id, project_id, output_ids)

    # pass chunks and query to generator
    generator_type = generator_method.pop("type")
    generator_method.update({"logger": session_logger, "user_id": user_id, "db": db}) # "project_id": project_id
    generator_instance = TYPE_MAPPER[generator_type](**generator_method)

    session_logger.log_step(task="info_text", layer=1, log_text=f"Starting generator call")
    output_answer = await generator_instance.run_generation(query=query, history=history, input_chunks=metadata["Chunk"])

    return output_answer, metadata





async def run_document_pipeline(query, input_ids, input_pipeline, logger, user_id, project_id, doc_id, db):

    logger.log_step(task="info_text", layer=1, log_text=f"Starting Document Pipeline")
    if input_pipeline:
        pipeline_output_ids = input_ids

        for method in input_pipeline:

            method_type = method.pop("type")

            logger.log_step(task="info_text", layer=2, log_text=f"**Starting {method["level"]} retrieval with {method_type}**")

            logger.log_step(task="table", layer=1, log_text=f"Method description: ", table_data=method)


            method.update({"logger": logger, "user_id": user_id, "project_id": project_id, "doc_id": doc_id, "db": db})
            method_instance = TYPE_MAPPER[method_type](**method)



            pipeline_output_dict = await method_instance.run_retrieval(query=query, filter_ids=pipeline_output_ids)



            # stop pipeline if any retriever returns no IDs
            if not pipeline_output_dict:

                return []

            pipeline_output_ids = pipeline_output_dict["retrieval_id"]

            # logg chunks

    #if no pipeline was exported for this doc, just filter the input ids
    else:

        retrieval_rows, _ = await Retrieval.get_all(
            columns=["retrieval_id"],
            where_dict={"user_id": user_id, "project_id": project_id, "retrieval_id": input_ids, "doc_id": doc_id},
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

async def run_embeddings(method_list: list[dict[str, Any]], user_id: UUID, project_id: UUID, doc_id: UUID, db: AsyncSession):
    log_path = await get_log_path(user_id, stage="retrieval")
    session_logger = InfoLogger(log_path=log_path, stage="retrieval")

    # logg
    doc_title = await get_doc_title(user_id, project_id, doc_id, db=db)
    session_logger.log_step(task="header_1", layer=2, log_text=f"Generating Embeddings in project {project_id} for document: {doc_title}")
    log_pipeline_methods(session_logger, method_list)

    for method in method_list:


        method_type = method.pop("type")
        method.update({"logger": session_logger, "user_id": user_id, "project_id": project_id, "doc_id": doc_id, "db": db})


        method_instance = EMBEDDING_TYPE_MAPPER[method_type](**method)
        await method_instance.generate_embeddings()



    # Finally we export the logs to md
    await export_logs(log_path)







async def run_doc_embeddings(retrieval_pipeline, user_id, project_id, doc_id, db: AsyncSession):

    if not retrieval_pipeline_not_empty(retrieval_pipeline):
        return False


    # We run embeddings if needed
    embedding_methods = [
        copy.deepcopy(method)
        for method in retrieval_pipeline
        if method["type"] == "EmbeddingRetriever"
    ]

    if embedding_methods:
        await run_embeddings(embedding_methods, user_id, project_id, doc_id, db)

    return True



