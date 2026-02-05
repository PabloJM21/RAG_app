# Starting Extraction for document: SoSe2025_Biomedizin-II_Nervensystem.pdf

## Starting Evaluation of Pipelines

Using following Method:



| type | model | prompt | target_level | history |
| --- | --- | --- | --- | --- |
| Enriching | coder | A score in the range 0-100 that evaluates the quality of the chunking process | document | False |

### Pipeline 1

This Pipeline consists of following methods:



| type | from | to | what | position | caption | color |
| --- | --- | --- | --- | --- | --- | --- |
| Extractor | Section | document | title | top | A section title of this document | #ffffff |



| type | where | model | prompt | position | caption | history |
| --- | --- | --- | --- | --- | --- | --- |
| Enricher | document | thinker | A complete summary of the chunk in the same language based on the provided section titles | replace |  | False |



| type | where | model | prompt | position | caption | history |
| --- | --- | --- | --- | --- | --- | --- |
| Enricher | document | thinker | Rewrite this text chunk skipping the introduction and talking only about the scientific content. | replace |  | False |

### Starting Extractor from Section to document

Method finished after 0.12 seconds

### Starting Enricher at document level

Method finished after 5.47 seconds

### Starting Enricher at document level

Method finished after 3.94 seconds

Session evaluator: <app.rag_services.evaluator_service.EnricherEvaluator object at 0x7efe23811640>

Pipeline Evaluation completed for target level document obtaining an average score of 85.0

### Found best pipeline: Pipeline 0

### Starting Extractor from Section to document

Method finished after 0.03 seconds

### Starting Enricher at document level

Method finished after 4.12 seconds

### Starting Enricher at document level

Method finished after 3.43 seconds

Session evaluator: None
