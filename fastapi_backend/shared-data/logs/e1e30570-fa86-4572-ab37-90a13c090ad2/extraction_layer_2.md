# Starting Extraction for document: DM4DataScience-2023-Lecture04-3-41.pdf

## Running Pipeline 1

This Pipeline consists of following methods:



| color | type | where | model | prompt | history |
| --- | --- | --- | --- | --- | --- |
| #ffffff | Filter | Section | coder | A boolean that is True if the chunk's content could be study material, and False if it's empty or personal data. | True |



| color | type | from | to | what | position | caption |
| --- | --- | --- | --- | --- | --- | --- |
| #ffffff | Extractor | Section | document | title | top | A section title of this document |



| color | type | where | model | prompt | position | caption | history |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #ffffff | Enricher | document | coder | A complete summary of the document based on its section names, in the same language as most of this names. | replace |  | False |



| color | type | where | model | prompt | position | caption | history |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #ffffff | Enricher | document | coder | A paraphrase of this text skiping the context introduction if present, in the same language | replace |  | False |



| color | type | from | to | what | position | caption |
| --- | --- | --- | --- | --- | --- | --- |
| #ffffff | Extractor | Section | Chapter | title | replace | A section title of this document |



| color | type | where | model | prompt | position | caption | history |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #ffffff | Enricher | Chapter | coder | A complete summary of the Chapter based on its section names, in the same language. | replace |  | True |



| color | type | from | to | what | position | caption |
| --- | --- | --- | --- | --- | --- | --- |
| #ffffff | Extractor | Chapter | Section | content | bottom | Context |



| color | type | where |
| --- | --- | --- |
| #ffffff | Reset | Chapter |

### Starting Filter at Section level

Method finished after 43.33 seconds

### Starting Extractor from Section to document

Method finished after 0.06 seconds

### Starting Enricher at document level

Method finished after 1.95 seconds

### Starting Enricher at document level

Method finished after 2.34 seconds

### Starting Extractor from Section to Chapter

Method finished after 0.05 seconds

### Starting Enricher at Chapter level

Method finished after 10.59 seconds

### Starting Extractor from Chapter to Section

Method finished after 0.06 seconds

### Starting Reset at Chapter level

Method finished after 0.01 seconds
