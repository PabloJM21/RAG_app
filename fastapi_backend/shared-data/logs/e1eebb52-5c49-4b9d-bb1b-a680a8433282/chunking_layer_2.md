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

Chunking at Chapter level completed in 0.65 seconds

Chunking at Section level completed in 6.42 seconds

## Pipeline Evaluation completed for target level Section obtaining an average score of 90.46153846153847

Completed chunking in 7.08 seconds

Chunking at Chapter level completed in 1.01 seconds

Chunking at Section level completed in 9.56 seconds

## Pipeline Evaluation completed for target level Section obtaining an average score of 90.22222222222223

Completed chunking in 10.58 seconds
