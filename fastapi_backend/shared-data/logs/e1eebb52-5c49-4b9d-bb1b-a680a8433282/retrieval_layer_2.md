# Starting Retrieval

## Starting Document Pipeline for Document: SoSe2025_Biomedizin-II_Nervensystem.pdf

This Pipeline consists of following methods:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | embedding_model |
| --- | --- | --- | --- | --- | --- |
| EmbeddingRetriever | Section | 20 | coder | A new string matching this QUERY suited for retrieving text chunks based on embeddings and cosine similarity | e5-mistral-7b-instruct |



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | reasoner_model |
| --- | --- | --- | --- | --- | --- |
| ReasonerRetriever | rerank | 5 | coder | A new string matching this QUERY suited for retrieving text chunks based on direct LLM calls | thinker |

Finishing Document Pipeline

## Starting Generation Pipeline

This Pipeline consists of following method:



| type | query_transformation_model | query_transformation_prompt | generator_model | generator_prompt |
| --- | --- | --- | --- | --- |
| Generator | coder | A new string matching this QUERY that can be directly combined with some text chunks to provide a RAG answer | thinker | A complete answer to this QUERY based only on the provided CHUNKS |
