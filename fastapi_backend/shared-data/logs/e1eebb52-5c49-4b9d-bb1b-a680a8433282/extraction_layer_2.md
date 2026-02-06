# Starting Extraction for document: SoSe2024_Biomedizin-II_Hormonsystem.pdf

## Starting Evaluation of Pipelines

Using following Method:



| type | model | prompt | target_level | history |
| --- | --- | --- | --- | --- |
| Enriching | coder | A score in the range 0-100 that evaluates the quality of the chunking process | document | False |

### Pipeline 1

This Pipeline consists of following methods:



| type | where | model | prompt | history |
| --- | --- | --- | --- | --- |
| Filter | Section | coder | A boolean that is True if the chunk's content could be study material, and False if it's empty or personal data. | True |



| type | from | to | what | position | caption |
| --- | --- | --- | --- | --- | --- |
| Extractor | Section | document | title | top |  |



| type | where | model | prompt | position | caption | history |
| --- | --- | --- | --- | --- | --- | --- |
| Enricher | document | thinker | A complete summary of the chunk in the same language based on the provided section titles | replace |  | False |



| type | where | model | prompt | position | caption | history |
| --- | --- | --- | --- | --- | --- | --- |
| Enricher | document | thinker | Rewrite this text chunk skipping the introduction and talking only about the scientific content. | replace |  | False |

### Starting Filter at Section level

Method finished after 26.65 seconds

### Starting Extractor from Section to document

Method finished after 0.14 seconds

### Starting Enricher at document level

Method finished after 3.68 seconds

### Starting Enricher at document level

Method finished after 4.44 seconds

Pipeline Evaluation completed for target level document obtaining an average score of 85.0

### Found best pipeline: Pipeline 0

### Starting Filter at Section level

Method finished after 19.78 seconds

### Starting Extractor from Section to document

Method finished after 0.11 seconds

### Starting Enricher at document level

Method finished after 5.71 seconds

### Starting Enricher at document level

Method finished after 3.64 seconds
