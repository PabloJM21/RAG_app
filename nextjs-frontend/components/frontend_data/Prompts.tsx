




//generator_prompt
export const GENERATOR_PROMPTS = [
  "A complete answer to this QUERY based only on the provided CHUNKS, in the same language",
];

export const EMBEDDING_QUERY_PROMPTS = [
  "A new string matching this QUERY suited for retrieving text chunks based on embeddings and cosine similarity, in the same language",
];

export const REASONER_QUERY_PROMPTS = [
  "A new string matching this QUERY suited for retrieving text chunks based on direct LLM calls, in the same language",
];

export const BM25_QUERY_PROMPTS = [
  "A new string matching this QUERY suited for retrieving text chunks based on the BM25 method, in the same language",
];

export const GENERATOR_QUERY_PROMPTS = [
  "A new string matching this QUERY that can be directly combined with some text chunks to provide a RAG answer, in the same language",
];

