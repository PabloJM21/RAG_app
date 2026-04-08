# Starting Extraction for document: lec13_Randomness.pdf

## Running Pipeline 1

This Pipeline consists of following methods:



| color | type | level | model | prompt | history |
| --- | --- | --- | --- | --- | --- |
| #ffffff | Filter | Section | coder | A boolean that is True if the chunk's content consists of more than 5 words, and False otherwise | False |



| color | type | input_level | output_level | what | position | caption |
| --- | --- | --- | --- | --- | --- | --- |
| #ffffff | Extractor | Section | document | title | replace | A section title of this document |



| color | type | level | model | prompt | position | caption | history |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #ffffff | Enricher | document | thinker | A complete summary of the document based on its section names, in english. | replace |  | True |

### Starting Filter at Section level

Method finished after 76.16 seconds

### Starting Extractor from Section to document

Method finished after 0.08 seconds

### Starting Enricher at document level

Method finished after 3.47 seconds
