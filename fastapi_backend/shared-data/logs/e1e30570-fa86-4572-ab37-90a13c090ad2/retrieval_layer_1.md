# Starting Retrieval

## Starting Routing Pipeline

This Pipeline consists of following method:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | reasoner_model |
| --- | --- | --- | --- | --- | --- |
| ReasonerRetriever | document | 1 | coder | A paraphrase of this QUERY suited for retrieving text chunks based on direct LLM calls, in the same language | thinker |

### Starting query transformation

Query transformed successfully:



| Input Query | Output Query |
| --- | --- |
| Explain me the difference between DOI and PID | What are the key differences between DOI and PID in academic and research contexts? |

### Starting retrieval

Retrieving 1 out of 2 Chunks

## Processing Document: DM4DataScience-2023-Lecture05-4-41.pdf

Found Document Pipeline

## Starting Document Pipeline

This Pipeline consists of following methods:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | k1 | b |
| --- | --- | --- | --- | --- | --- | --- |
| BM25Retriever | Chapter | 10 | coder | A new string matching this QUERY suited for retrieving text chunks based on the BM25 method, in the same language | 1.5 | 0.75 |



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | reasoner_model |
| --- | --- | --- | --- | --- | --- |
| ReasonerRetriever | Section | 5 | coder | A paraphrase of this QUERY suited for retrieving text chunks based on direct LLM calls, in the same language | thinker |

Starting Document Pipeline

Starting with method:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | k1 | b |
| --- | --- | --- | --- | --- | --- | --- |
| BM25Retriever | Chapter | 10 | coder | A new string matching this QUERY suited for retrieving text chunks based on the BM25 method, in the same language | 1.5 | 0.75 |

### Starting query transformation

Query transformed successfully:



| Input Query | Output Query |
| --- | --- |
| Explain me the difference between DOI and PID | DOI PID difference explanation scientific identifiers |

### Starting retrieval

Retrieving 10 out of 3 Chunks

Output size: 3 Chunks

Starting with method:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | reasoner_model |
| --- | --- | --- | --- | --- | --- |
| ReasonerRetriever | Section | 5 | coder | A paraphrase of this QUERY suited for retrieving text chunks based on direct LLM calls, in the same language | thinker |

### Starting query transformation

Query transformed successfully:



| Input Query | Output Query |
| --- | --- |
| Explain me the difference between DOI and PID | What are the key differences between DOI and PID in academic and research contexts? |

### Starting retrieval

Retrieving 5 out of 32 Chunks

Output size: 5 Chunks

Finishing Document Pipeline

Finishing processing Document

# Starting Generation Pipeline

This Pipeline consists of following method:



| type | query_transformation_model | query_transformation_prompt | generator_model | generator_prompt |
| --- | --- | --- | --- | --- |
| Generator | coder | A new string matching this QUERY that can be directly combined with some text chunks to provide a RAG answer, in the same language | thinker | A complete answer to this QUERY based only on the provided CHUNKS, in the same language |

Starting generator call

Finishing generator call. Output answer:
The chapter provides an overview of persistent identifier (PID) systems, emphasizing that a DOI (Digital Object Identifier) is a specific type of PID used to permanently identify digital objects such as research papers, datasets, and books. While a DOI is a globally resolvable alphanumeric string that redirects to a landing page and stores its metadata in a separate database, the term PID encompasses a wider range of identifiers designed for long‑term persistence, including Handles, ARKs, PURLs, ISBNs, ISSNs, ORCIDs, and others. The text highlights that both ePIC PIDs and DOIs are built on the Handle System, allowing global resolution without needing knowledge of the owning institution, and that they cannot be deleted, unlike generic handles which may be removed according to policy. Effective PID management requires reliable, robust, and long‑term operational services that guarantee resolution even if the original object disappears. Various organizations adopt well‑tested PID infrastructures (Handle, DOI, URN, ARK, etc.) to ensure sustainability and accessibility of digital resources over time.

## Final Results

Generation concluded succesfully obtaining following output:



| Query | Output |
| --- | --- |
| Explain me the difference between DOI and PID | The chapter provides an overview of persistent identifier (PID) systems, emphasizing that a DOI (Digital Object Identifier) is a specific type of PID used to permanently identify digital objects such as research papers, datasets, and books. While a DOI is a globally resolvable alphanumeric string that redirects to a landing page and stores its metadata in a separate database, the term PID encompasses a wider range of identifiers designed for long‑term persistence, including Handles, ARKs, PURLs, ISBNs, ISSNs, ORCIDs, and others. The text highlights that both ePIC PIDs and DOIs are built on the Handle System, allowing global resolution without needing knowledge of the owning institution, and that they cannot be deleted, unlike generic handles which may be removed according to policy. Effective PID management requires reliable, robust, and long‑term operational services that guarantee resolution even if the original object disappears. Various organizations adopt well‑tested PID infrastructures (Handle, DOI, URN, ARK, etc.) to ensure sustainability and accessibility of digital resources over time. |
