import json
import asyncio
from typing import Any, Dict, List, Optional, Iterable
import re
import numpy as np
import pandas as pd
import time

#Orchestrators
from app.rag_apis.chat_api import ChatOrchestrator

#embeddings
from openai import OpenAI
from app.rag_apis.embed_api import EmbeddingOrchestrator


#loggs
from app.log_generator import InfoLogger


# Database ops
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Doc, Paragraph, Retrieval, Embedding




class Retriever:

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, level: str, retrieval_amount: int):
        self.db = db
        self.user_id = user_id
        self.logger = logger


        self.level = level
        self.k = retrieval_amount




    async def _find_source_data(self, filter_ids: Iterable = ()):
        
        # the retrieval_ids list should correspond to one paragraphs table and level
    
        retrieval_rows, columns = await Retrieval.get_all(where_dict={"user_id": self.user_id, "retrieval_id": filter_ids}, db=self.db)
        retrieval_df = pd.DataFrame(retrieval_rows, columns=columns)

  

        input_doc_id = list(set(retrieval_df["doc_id"].values))
        filter_level = list(set(retrieval_df["level"].values))
        
        if len(input_doc_id) > 1 or len(filter_level) > 1:
            raise Exception(f"Filter consists of {len(filter_level)} levels in {len(input_doc_id)} tables")
        else:
            filter_level = filter_level[0]
            input_doc_id = input_doc_id[0]



        level_ids = list(set(retrieval_df["level_id"].values))
        # ------ OLD APPROACH --------
        #source_rows = []
        #for id_value in level_ids:
            #source_rows += self.db.get_all(input_doc_id, f"{filter_level}_id=?", [id_value])
        # source_df = pd.DataFrame(source_rows)
        # ----------------------------

        paragraph_rows, columns = await Paragraph.get_all(where_dict={"user_id": self.user_id, "doc_id": input_doc_id, f"{filter_level}_id": level_ids}, db=self.db)
        source_df = pd.DataFrame(paragraph_rows, columns=columns)


        level_ids = list(set(source_df[f"{self.level}_id"].values))

        return input_doc_id, level_ids





    async def _get_retrieval_content(self, retrieval_ids: Iterable = ()):



        retrieval_rows, columns = await Retrieval.get_all(where_dict={"user_id": self.user_id, "retrieval_id": retrieval_ids}, db=self.db)
        retrieval_df = pd.DataFrame(retrieval_rows, columns=columns)


        retrieval_output = retrieval_df["retrieval_output"].tolist()
    
       
        return retrieval_output


    async def _get_retrieval_df(self, filter_ids: Optional[Iterable] = ()):

        # check if there are filters, like document, chapter... from previous retrieval

        if filter_ids:
            doc_id, level_ids = self._find_source_data(filter_ids)

            retrieval_rows, columns = await Retrieval.get_all(where_dict={"user_id": self.user_id, "doc_id": doc_id, "level_id": level_ids, "level": self.level}, db=self.db)
            # retrieval_rows should be a list of only one dict, as (doc_id, level_id) is 1-to-1 with retrieval_id

        else:

            retrieval_rows, columns = await Retrieval.get_all(where_dict={"user_id": self.user_id, "level": self.level}, db=self.db)

        retrieval_df = pd.DataFrame(retrieval_rows, columns=columns)


        # print("retrieval_df: ", retrieval_df.head())
        # retrieval_df.to_excel('retrieval_df.xlsx', index=False)

        return retrieval_df


class ReasonerRetriever(Retriever):
    """"
    Provides retrieval_output that aligns best with the raw input query

    retrieval_output should ideally consist of small content (like title + small summary)

    To create an instance of the class, provide the level at which the retrieval will take place
    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, level: str, retrieval_amount: int, query_transformation_model: str, reasoner_model: str):

        super().__init__(db, logger, user_id, level, retrieval_amount)





    def _get_retrieval_ids(self, query: str, retrieval_input_chunks: str) -> List:
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



    async def run_retrieval(self, query: str, filter_ids: Optional[Iterable] = ()):
        start = time.time()

        retrieval_df = await self._get_retrieval_df(filter_ids)


        retrieval_input_chunks = ""
        for i, row in retrieval_df.iterrows():
            retrieval_input_chunks += f"CHUNK_ID={row["retrieval_id"]}\n{row["content"]}\n"

        retrieval_output_ids = self._get_retrieval_ids(query, retrieval_input_chunks)

        end = time.time()

        #output_mask = retrieval_df["retrieval_id"].isin(retrieval_output_ids)

        #retrieval_output = retrieval_df[output_mask]["retrieval_output"].tolist()



        # logg
        self.logger.log_step(task="validate", log_text="Reasoner Retrieval", inputs=query, outputs=retrieval_output_ids, duration=f"{round(end-start, 2)} seconds")

        return retrieval_output_ids


class EmbeddingRetriever(Retriever):
    """
    Contains all functionality to generate embeddings of a query and retrieval_input, and provide retrieval_output based on cosine similarity.

    Also outputs retrieval IDs, and can take retrieval IDs as input from previous level for targeted retrieval. In iterative retrieving (retriever_1 - retriever_2 ...) only the retrieval IDs are needed for the next iteration.

    To create an instance of the class, provide the level at which the retrieval will take place, plus the embedding model.

    Provides two methods: generate_embeddings, similarity_search
    """

    def __init__(self, db: AsyncSession, logger: InfoLogger, user_id: UUID, level: str, retrieval_amount: int, query_transformation_model: str, embedding_model: str):

        super().__init__(db, logger, user_id, level, retrieval_amount)  # modern Python 3 style, no super(EmbeddingRetriever, self)


        # self.client = OpenAI()
        self.embedding_model = embedding_model




        self.generate_embeddings()



    # ============================================================
    # INTERNAL HELPERS
    # ============================================================

    async def _embed(self, texts):
        orchestrator = EmbeddingOrchestrator()
        embeddings = await orchestrator.get_embedding(texts, label=self.embedding_model)  # embeddings
        #print("Embedding shape:", embeddings.shape)
        #print("First 5 dims:", embeddings[0][:5])

        return embeddings

    async def generate_embeddings(self, filter_ids: Optional[Iterable] = ()) -> None:

        # loggs

        filter_prompt = ""
        #if filter_ids:
            #filter_prompt += f", filtering on previous retrieval_ids={", ".join(map(str, filter_ids))}"

        self.logger.log_step(log_text=f"Embedding the retrieval input of each {self.level}" + filter_prompt)

        retrieval_df = await self._get_retrieval_df(filter_ids)



        # 1. Embed the retrieval input content asynchronously
        async def embed_columns(retrieval_df):

            print(retrieval_df["content"].tolist())
            embeddings = await self._embed(retrieval_df["content"].tolist())
            print(f"Generated embeddings for {self.level}")
            # Convert to list of Python lists
            embeddings = [np.array(e, dtype=np.float32).tobytes() for e in embeddings]

            output_df = pd.DataFrame({"user_id": [self.user_id] * len(embeddings), "retrieval_id": retrieval_df["retrieval_id"], "embedding": embeddings})




            # print("input_df before return: ", input_df)

            return output_df

        embedding_df = await embed_columns(retrieval_df)


        # get current retrieval ids
        rows = await Embedding.get_all(where_dict={"user_id": self.user_id}, db=self.db)
        dict_df = pd.DataFrame(rows)
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

        retrieval_df = await self._get_retrieval_df(filter_ids)


        # 3. Load embeddings for these IDs if they exist

        retrieval_ids = retrieval_df["retrieval_id"].tolist()
        embedding_rows, columns = await Embedding.get_all(where_dict={"user_id": self.user_id, "retrieval_id": retrieval_ids}, db=self.db)
        embedding_df = pd.DataFrame(embedding_rows, columns=columns)


        # 4. Compute cosine similarity using the static method

        raw = list(set(embedding_df["embedding"]))

        # Convert BLOBs back to float32 vectors
        vectors = [np.frombuffer(b, dtype=np.float32) for b in raw]

        # Make a matrix shaped (N, dim)
        emb_matrix = np.vstack(vectors)

        # Embed the query
        query_embedding = np.array((await self._embed([query]))[0], dtype="float32")

        # compute score

        embedding_df["cosine_similarity"] = self._cosine_similarity(query_embedding, emb_matrix)

        # 5. Sort top-k
        embedding_df = embedding_df.sort_values("cosine_similarity", ascending=False).head(self.k)

        # extract retrieval_ids from the Retrievals table


        retrieval_output_ids = embedding_df["retrieval_id"].tolist()

        end = time.time()

        # loggs



        self.logger.log_step(task="validate", log_text=f"Embedding Retrieval", inputs=query, outputs=retrieval_output_ids, scores=embedding_df["cosine_similarity"].tolist(), duration=f"{round(end-start, 2)} seconds")



        return retrieval_output_ids

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

