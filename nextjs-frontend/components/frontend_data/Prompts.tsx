


export const ENRICHER_PROMPTS = ["A complete summary of the document based on its section names, in the same language.", "A concise 1-2 sentence summary of the chunk in the same language.", "A list of 5-7 key topics or entities mentioned in this chunk in the same language.", "A list of 3-5 questions this chunk could answer."]
export const FILTER_PROMPTS = ["A boolean that is True if the chunk's content could be study material, and False if it's empty or personal data.", "A boolean that is False if the chunk's content doesn't align with the provided context, and True otherwise"]


//generator_prompt
export const GENERATOR_PROMPTS = [
  "A complete answer to this QUERY based only on the provided CHUNKS, in the same language",
];

export const EMBEDDING_QUERY_PROMPTS = [
  "A paraphrase of this QUERY suited for retrieving text chunks based on embeddings and cosine similarity, in the same language",
];

export const REASONER_QUERY_PROMPTS = [
  "A paraphrase of this QUERY suited for retrieving text chunks based on direct LLM calls, in the same language",
];

export const BM25_QUERY_PROMPTS = [
  "A new string matching this QUERY suited for retrieving text chunks based on the BM25 method, in the same language",
];

export const GENERATOR_QUERY_PROMPTS = [
  "A new string matching this QUERY that can be directly combined with some text chunks to provide a RAG answer, in the same language",
];

