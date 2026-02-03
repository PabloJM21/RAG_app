# Starting Retrieval

## Starting Document Pipeline for Document: SoSe2025_Biomedizin-II_Nervensystem.pdf

This Pipeline consists of following methods:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | embedding_model |
| --- | --- | --- | --- | --- | --- |
| EmbeddingRetriever | Section | 20 | coder | A new string matching this QUERY suited for retrieving text chunks based on embeddings and cosine similarity | e5-mistral-7b-instruct |



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | reasoner_model |
| --- | --- | --- | --- | --- | --- |
| ReasonerRetriever | rerank | 5 | coder | A new string matching this QUERY suited for retrieving text chunks based on direct LLM calls | thinker |

Logging document_pipeline

Starting with method:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | embedding_model |
| --- | --- | --- | --- | --- | --- |
| EmbeddingRetriever | Section | 20 | coder | A new string matching this QUERY suited for retrieving text chunks based on embeddings and cosine similarity | e5-mistral-7b-instruct |

Retrieved 20 Chunks

Starting with method:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | reasoner_model |
| --- | --- | --- | --- | --- | --- |
| ReasonerRetriever | rerank | 5 | coder | A new string matching this QUERY suited for retrieving text chunks based on direct LLM calls | thinker |

Input Chunks:
 CHUNK_ID=15
NERVENSYSTEM
CHUNK_ID=18
- · Sie können die dem Nervensystem zugehörigen Aufgaben und Organe/Bestandteile/Strukturen nennen und beschreiben.
- · Sie können beispielhaft Sinne und Sinnesorgane benennen.
- · Sie können die 3 Grundfunktionen des Nervensystems auflisten und mit eigenen Worten erläutern.
- · Sie können den Aufbau des Nervensystems zeichnen, sowie die einzelnen Untereinheiten mit eigenen Worten beschreiben und vergleichen.
- · Sie können die Funktionen von Neuronen und Gliazellen beschreiben und gegenüberstellen.
- · Sie können die Voraussetzungen, sowie die Entstehung und den Verlauf eines Aktionspotentials mit eigenen Worten beschreiben.
CHUNK_ID=32
- · Besteht aus Gehirn und Rückenmark
CHUNK_ID=100
- (1) Sinnesorgane
- (2) Sensorische
- (3) Autonome
- (4) Gehirn
- (5) Rückenmark
- (6) Periphere
- (7) Parasympathikus
- (9) Neuron
- (10) Axon
- (11) Gliazellen
- (12) Aktionspotential
- (13) Ionenkanäle
- (14) Ruhemembranpotential
- (15) Frequenz
- (8) Motoneurone
- (16) Myelinscheide
- (17) Saltatorisch
- (18) (Multiple) Sklerose
- (19) Synapse
- (20) Neurotransmitter
- (21) Regeneration
- (22) Reflexe

Output IDs:
 ['18', '100', '32', '15']

Retrieved 4 Chunks

Finishing Document Pipeline

## Starting Generation Pipeline

This Pipeline consists of following method:



| type | query_transformation_model | query_transformation_prompt | generator_model | generator_prompt |
| --- | --- | --- | --- | --- |
| Generator | coder | A new string matching this QUERY that can be directly combined with some text chunks to provide a RAG answer | thinker | A complete answer to this QUERY based only on the provided CHUNKS |
