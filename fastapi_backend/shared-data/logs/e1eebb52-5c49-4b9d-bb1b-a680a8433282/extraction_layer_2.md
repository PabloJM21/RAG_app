# Starting Extraction for document: SoSe2025_Biomedizin-II_Nervensystem.pdf

## Running Pipeline 1

This Pipeline consists of following methods:



| type | where | model | prompt | history |
| --- | --- | --- | --- | --- |
| Filter | Section | coder | A boolean that is True if the chunk's content could be study material, and False if it's empty or personal data. | True |



| type | from | to | what | position | caption |
| --- | --- | --- | --- | --- | --- |
| Extractor | Section | document | title | top | A section title of this document |



| type | where | model | prompt | position | caption | history |
| --- | --- | --- | --- | --- | --- | --- |
| Enricher | document | thinker | A complete summary of the chunk in the same language based on the provided section titles | replace | Summary | False |

Starting Filter at Section level

Starting filtering chunks

Starting Extractor from Section to document

Completed Extraction

Starting Enricher at document level

Completed chunk enrichment
