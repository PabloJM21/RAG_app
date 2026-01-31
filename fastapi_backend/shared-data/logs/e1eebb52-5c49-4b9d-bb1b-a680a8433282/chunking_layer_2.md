## Starting Evaluation of Pipelines

using following Method:



| type | model | prompt | target_level | history |
| --- | --- | --- | --- | --- |
| Chunking | coder | A score in the range 0-100 that evaluates the quality of the chunking process | Section | true |

Pipeline 1

This Pipeline consists of following methods:



| type | level_name | separator | tokenizer_model | max_tokens | with_title |
| --- | --- | --- | --- | --- | --- |
| Paragraph Chunker | Chapter | ## | intfloat/e5-mistral-7b-instruct | 1050 | True |



| type | level_name | separator | tokenizer_model | max_tokens | with_title |
| --- | --- | --- | --- | --- | --- |
| Paragraph Chunker | Section | ## |  |  | True |

Chunking at Chapter level completed in 0.6 seconds

Chunking at Section level completed in 0.2 seconds

## Pipeline Evaluation completed for target level Section obtaining an average score of nan

Completed chunking in 0.8 seconds

Chunking at Chapter level completed in 0.53 seconds

Chunking at Section level completed in 0.2 seconds

## Pipeline Evaluation completed for target level Section obtaining an average score of nan

Completed chunking in 0.75 seconds
