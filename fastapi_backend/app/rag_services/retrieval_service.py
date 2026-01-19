import json
import asyncio
from typing import Any, Dict, List, Optional, Iterable
import re
import numpy as np
import pandas as pd
import time

#Orchestrators
from app.rag_apis.chat_api import ChatOrchestrator

# helpers for disc paths
from app.rag_services.helpers import get_doc_paths, get_log_paths, get_doc_name

#embeddings
from openai import OpenAI
from app.rag_apis.embed_api import EmbeddingOrchestrator


#loggs
from app.log_generator import InfoLogger


# Database ops
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocPipelines, MainPipeline, Paragraph, Retrieval, Embedding






class BaseRetriever:
    def __init__(
        self,
        db: AsyncSession,
        logger: InfoLogger,
        user_id: UUID,
        doc_id: UUID,
        level: str,
        retrieval_amount: int,
    ):
        self.db = db
        self.logger = logger
        self.user_id = user_id
        self.doc_id = doc_id
        self.level = level
        self.k = retrieval_amount

    # ---------------------------------------------------------
    # Internal helpers
    # ---------------------------------------------------------

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
    def update_output_dict(retrieval_dict, output_dict):

        # add the doc_ids of the retrieved chunks to the output_dict
        output_dict["doc_id"] = []
        for i, retrieval_id in enumerate(retrieval_dict["retrieval_id"]):
            if retrieval_id in output_dict["retrieval_id"]:
                output_dict["doc_id"].append(retrieval_dict["doc_id"][i])






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

        retrieval_dict = self.rows_to_columns(retrieval_rows)

        # Extract filter level and IDs
        filter_level = retrieval_dict["level"][0]
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
        level_ids = self.rows_to_columns(paragraph_rows)[f"{self.level}_id"]

        return level_ids

    async def get_content(self, retrieval_ids: Iterable = ()):
        """
        Return a list of content strings for the given retrieval_ids.
        """
        where = {"user_id": self.user_id, "retrieval_id": retrieval_ids}

        retrieval_rows, columns = await Retrieval.get_all(
            columns=["retrieval_id", "content"],
            where_dict=where,
            db=self.db,
        )


        return self.rows_to_columns(retrieval_rows)

    async def _filter_content(self, filter_ids: Optional[Iterable] = ()):
        """
        Return a DataFrame with retrieval_id and content.
        If filter_ids are provided, restrict results to the corresponding
        document + level_ids from previous retrieval.
        """

        columns = ["retrieval_id", "content"]

        # if retriever is not router (if doc_id) and there are filter_ids
        if filter_ids and self.doc_id:
            level_ids = await self._find_source_data(filter_ids)

            where = {
                "user_id": self.user_id,
                "doc_id": self.doc_id,
                "level_id": level_ids,
                "level": self.level,
            }


        # if retriever is not router but there are no filter_ids, in which case there is no router
        elif self.doc_id:
            where = {
                "user_id": self.user_id,
                "doc_id": self.doc_id,
                "level": self.level,
            }


        # if retriever is router (no doc_id). In this case, there are never filter_ids
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

        return self.rows_to_columns(retrieval_rows)
    
    
    async def get_retrieval_content(self, filter_ids: Optional[Iterable] = ()):
        
        # if the reranker is running, return the content of the filter_ids
        if self.level == "rerank":
            return await self.get_content(filter_ids)
        
        else:
            return await self._filter_content(filter_ids)









# ---------------------------------------------

# ----------------CHUNKERS --------------------

# ---------------------------------------------
# Requirement for new Retriever classes: "run_retrieval" method with the specified input and output types




class ReasonerRetriever(BaseRetriever):
    """"
    Provides retrieval_output that aligns best with the raw input query

    retrieval_output should ideally consist of small content (like title + small summary)

    To create an instance of the class, provide the level at which the retrieval will take place
    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, level: str, retrieval_amount: int, query_transformation_model: str, reasoner_model: str, doc_id: Optional[UUID] = 0):

        super().__init__(db, logger, user_id, doc_id, level, retrieval_amount)





    def _retrieve_ids(self, query: str, retrieval_input_chunks: str) -> List:
        # Qwen3-Coder is explicitly an instruction-tuned coder model, so its usage profile lines up with OpenAIs mini line

        # QWEN2.5_CODER_32B_INSTRUCT

        system_prompt = f"""
                You are an assistant that must always respond in valid JSON following this schema:

                {{
                    "title": "Metadata",
                    "description": "Structured metadata",
                    "type": "object",
                    "properties": {{
                        "retrieval_ids": {{
                            "title": "retrieval_ids",
                            "description": "A list with the top {self.k} CHUNK_IDs that align better with this QUERY",
                            "type": "array",
                            "items": {{
                                "type": "string"
                            }}
                        }}
                    }}
                }}

        """

        user_prompt = f"""
            Please analyze following QUERY and CHUNK_IDs, and generate the specified object. 

            QUERY:
            ---
            {query}
            ---
            {retrieval_input_chunks}

            """

        chat_orchestrator = ChatOrchestrator()

        output_dict = json.loads(chat_orchestrator.call("thinker", system_prompt, user_prompt))

        print("printing Chat Output: ", output_dict)

        retrieval_output_ids = list(output_dict["retrieval_ids"])


        return retrieval_output_ids



    async def run_retrieval(self, query: str, filter_ids: Optional[Iterable] = ())-> Dict[str, List]:
        start = time.time()

        # 
        retrieval_dict = await self.get_retrieval_content(filter_ids)


        retrieval_input_chunks = ""
        for retrieval_id, content in zip(retrieval_dict["retrieval_id"], retrieval_dict["content"]):
            retrieval_input_chunks += f"CHUNK_ID={retrieval_id}\n{content}\n"

        retrieval_output_ids = self._retrieve_ids(query, retrieval_input_chunks)

        end = time.time()

        output_dict = {"retrieval_id": retrieval_output_ids}

        # add doc_ids to the dict, in case of the router
        if not self.doc_id:
            self.update_output_dict(retrieval_dict, output_dict)

        # logg
        self.logger.log_step(task="validate", log_text="Reasoner Retrieval", inputs=query, outputs=retrieval_output_ids, duration=f"{round(end-start, 2)} seconds")

        return output_dict






class EmbeddingRetriever(BaseRetriever):
    """
    Contains all functionality to generate embeddings of a query and retrieval_input, and provide retrieval_output based on cosine similarity.

    Also outputs retrieval IDs, and can take retrieval IDs as input from previous level for targeted retrieval. In iterative retrieving (retriever_1 - retriever_2 ...) only the retrieval IDs are needed for the next iteration.

    To create an instance of the class, provide the level at which the retrieval will take place, plus the embedding model.

    Provides two methods: generate_embeddings, similarity_search
    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, level: str, retrieval_amount: int, query_transformation_model: str, embedding_model: str, doc_id: Optional[UUID] = 0):

        super().__init__(db, logger, user_id, doc_id, level, retrieval_amount)  # modern Python 3 style, no super(EmbeddingRetriever, self)


        # self.client = OpenAI()
        self.embedding_model = embedding_model



    # ============================================================
    # INTERNAL HELPERS
    # ============================================================

    async def _embed(self, texts):
        orchestrator = EmbeddingOrchestrator()
        embeddings = await orchestrator.get_embedding(texts, label=self.embedding_model)  # embeddings

        return embeddings

    async def generate_embeddings(self, filter_ids: Optional[Iterable] = ()) -> None:

        # loggs

        filter_prompt = ""
        #if filter_ids:
            #filter_prompt += f", filtering on previous retrieval_ids={", ".join(map(str, filter_ids))}"

        self.logger.log_step(log_text=f"Embedding the retrieval input of each {self.level}" + filter_prompt)

        retrieval_dict = await self.get_retrieval_content(filter_ids)



        # 1. Embed the retrieval input content asynchronously
        async def embed_columns(retrieval_dict):

            print(retrieval_dict["content"])
            embeddings = await self._embed(retrieval_dict["content"])
            print(f"Generated embeddings for {self.level}")
            # Convert to list of Python lists
            embeddings = [np.array(e, dtype=np.float32).tobytes() for e in embeddings]

            output_df = pd.DataFrame({"user_id": [self.user_id] * len(embeddings), "retrieval_id": retrieval_dict["retrieval_id"], "embedding": embeddings})




            # print("input_df before return: ", input_df)

            return output_df

        embedding_df = await embed_columns(retrieval_dict)


        # get current retrieval ids
        rows, columns = await Embedding.get_all(where_dict={"user_id": self.user_id}, db=self.db)
        dict_df = pd.DataFrame(rows, columns=columns)
        current_retrieval_ids = list(set(dict_df["retrieval_id"].values)) if not dict_df.empty else []


        mask_update = embedding_df["retrieval_id"].isin(current_retrieval_ids)

        update_df = embedding_df[mask_update]

        # print("embedding_df after return 2: ", input_df)
        insert_df = embedding_df[~mask_update]
        # print("embedding_df: ", update_df)

        # 5. Insert embeddings
        if not insert_df.empty:
            dict_list = insert_df.to_dict(orient="records")
            for insert_dict in dict_list:
                await Embedding.insert_data(data_dict=insert_dict, db=self.db)

            await self.db.commit()

        # 6. Update embeddings
        if not update_df.empty:

            dict_list = update_df.to_dict(orient="records")

            for embedding_dict in dict_list:
                embedding_bytes = embedding_dict["embedding"]
                embedding = np.frombuffer(embedding_bytes, dtype=np.float32)  # or dtype used originally
                print("embedding dimensions:", embedding.shape)

                await Embedding.update_data(data_dict=embedding_dict, where_dict={"retrieval_id": embedding_dict["retrieval_id"]}, db=self.db)




    async def run_retrieval(self, query: str, filter_ids: Optional[Iterable] = (), k: int = 3):

        # loggs

        filter_prompt = ""
        if filter_ids:
            filter_prompt += f", filtering on retrieval_ids={", ".join(filter_ids)}"

        self.logger.log_step(log_text=f"EmbeddingRetriever: retrieving {k} {self.level}s " + filter_prompt)



        # 2. Find retrieval IDs for this level based on filter IDs - all of them if not given

        start = time.time()

        retrieval_dict = await self.get_retrieval_content(filter_ids)


        # 3. Load embeddings for these IDs, if they exist

        retrieval_ids = retrieval_dict["retrieval_id"]
        embedding_rows, columns = await Embedding.get_all(columns=["retrieval_id", "embedding"], where_dict={"user_id": self.user_id, "retrieval_id": retrieval_ids}, db=self.db)


        embedding_columns = self.rows_to_columns(embedding_rows)


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
        # extract retrieval_ids from the Retrievals table

        # convert nnumpy array back to list
        retrieval_output_ids = top_k_embedding_columns["retrieval_id"].tolist()

        end = time.time()

        # loggs

        output_dict = {"retrieval_id": retrieval_output_ids}

        # add doc_ids to the dict, in case of the router
        if not self.doc_id:
            self.update_output_dict(retrieval_dict, output_dict)

        self.logger.log_step(task="validate", log_text=f"Embedding Retrieval", inputs=query, outputs=retrieval_output_ids, scores=embedding_columns["cosine_similarity"].tolist(), duration=f"{round(end-start, 2)} seconds")



        return output_dict

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


# ============================================================
# RUN Retrieval
# ============================================================

async def get_content(db: AsyncSession, user_id: UUID, retrieval_ids: Iterable = ()):
    """
    Return a list of content strings for the given retrieval_ids.
    """
    def rows_to_columns(rows):

        if not rows:
            return {}
        cols = rows[0].keys()
        out = {c: [] for c in cols}
        for row in rows:
            for c in cols:
                out[c].append(row[c])

        return out


    where = {"user_id": user_id, "retrieval_id": retrieval_ids}

    retrieval_rows, columns = await Retrieval.get_all(
        columns=["retrieval_id", "content"],
        where_dict=where,
        db=db,
    )


    return rows_to_columns(retrieval_rows)






TYPE_MAPPER = {
    "ReasonerRetriever": ReasonerRetriever,
    "EmbeddingRetriever": EmbeddingRetriever,
}


async def run_retrieval(query: str, retrieval_dict: Dict[str, Any], user_id: UUID, db: AsyncSession):

    async def run_pipeline(retrieval_ids):
        for method in doc_pipeline:
            method.update({"logger": session_logger, "user_id": user_id, "doc_id": doc_id, "db": db})

            method_type = method.pop("type")
            method_instance = TYPE_MAPPER[method_type](**method)

            output_dict = await method_instance.run_retrieval(query=query, filter_ids=retrieval_ids)
            retrieval_ids = output_dict["retrieval_id"]

        return retrieval_ids

    log_path, log_md_path = await get_log_paths(user_id, stage="retrieval")
    session_logger = InfoLogger(log_path=log_path, stage="retrieval")

    router_method = retrieval_dict.pop("router")

    # if there is router
    if router_method:
        # log
        session_logger.log_step(task="table", log_text=f"Using following retriever as router: ", table_data=router_method)

        router_type = router_method.pop("type")
        router_method.update({"logger": session_logger, "user_id": user_id, "db": db})
        router_instance = TYPE_MAPPER[router_type](**router_method)

        output_dict = await router_instance.run_retrieval()
        retrieval_ids = output_dict["retrieval_id"]
        # use filter ids for further retrieval, in case there are any
        if retrieval_dict:
            doc_ids = output_dict["doc_id"]
            output_ids = []
            for doc_id in doc_ids:

                # log
                doc_name = await get_doc_name(user_id, doc_id, db=db)
                session_logger.log_step(task="header_1", log_text=f"Starting Retrieval for document: {doc_name}")

                doc_pipeline = retrieval_dict[doc_id]
                filter_ids = await run_pipeline(retrieval_ids)
                output_ids += filter_ids

            # Instead of "get_content", define new function that returns the content chunks and metadata
            output_content = await get_content(user_id=user_id, retrieval_ids=filter_ids, db=db)
        else:
            output_content = await get_content(user_id=user_id, retrieval_ids=retrieval_ids, db=db)

    # if there is no router
    elif retrieval_dict:
        output_ids = []
        # run all pipelines with no filter IDs
        for doc_id, doc_pipeline in retrieval_dict.items():
            filter_ids = await run_pipeline([])
            output_ids += filter_ids

        output_content = await get_content(user_id=user_id, retrieval_ids=filter_ids, db=db)


    return output_content


# ============================================================
# RUN Export, Embeddings
# ============================================================

TYPE_MAPPER = {
    "EmbeddingRetriever": EmbeddingRetriever,
}

async def run_embeddings(method_list: list[dict[str, Any]], user_id: UUID, doc_id: UUID, db: AsyncSession):
    log_path, log_md_path = await get_log_paths(user_id, stage="retrieval")
    session_logger = InfoLogger(log_path=log_path, stage="retrieval")

    # logg
    doc_name = await get_doc_name(user_id, doc_id, db=db)
    session_logger.log_step(task="header_1", log_text=f"Generating Embeddings for document: {doc_name}")
    session_logger.log_step(task="table", log_text=f"Using following methods: ", table_data=method_list)

    for method in method_list:
        method_type = method.pop("type")
        method.update({"logger": session_logger, "user_id": user_id, "doc_id": doc_id, "db": db})


        method_instance = TYPE_MAPPER[method_type](**method)
        await method_instance.generate_embeddings()









async def export_doc_pipeline(retrieval_pipeline, user_id, doc_id, db: AsyncSession):


    # First, we run embeddings if needed

    embedding_methods = [method for method in retrieval_pipeline if method["type"] == "EmbeddingRetriever"]

    if embedding_methods:
        await run_embeddings(embedding_methods, user_id, doc_id, db)

    # Finally, we export the pipeline to the MainPipeline table

    main_pipeline = await MainPipeline.get_row(where_dict={"user_id": user_id}, db=db)
    doc_pipelines = json.loads(main_pipeline.doc_pipelines)
    if doc_pipelines:
        doc_pipelines[doc_id] = retrieval_pipeline
    else:
        doc_pipelines = {doc_id: retrieval_pipeline}

    main_pipeline.doc_pipelines = json.dumps(doc_pipelines)

