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

Individual Scores



| input_chunk | output_chunk | score |
| --- | --- | --- |
| None | Das Nervensystem wird in zentrales (Gehirn, Rückenmark) und peripheres (somatisches, autonomes, enterisches) System unterteilt und erfüllt sensorische, integrative und motorische Funktionen. Das Cerebrum wird funktionell gegliedert; Neuronen bestehen aus Zellkörper, Axon und Dendriten, Gliazellen unterstützen und ermöglichen Regeneration. Der Übergang vom Ruhe‑ zum Aktionspotential beruht auf Ionenkanälen, Schwelle und Reizintensität; Myelinisierung erlaubt kontinuierliche und saltatorische Weiterleitung, wobei Neurotoxine und Multiple Sklerose die Leitfähigkeit beeinträchtigen. Synaptische Übertragung erfolgt an chemischen und elektrischen Synapsen, wobei Neurotransmitter freigesetzt werden; elektrische Synapsen ermöglichen schnelle, bidirektionale Signalübertragung. Die neuronale Erregung wird über die motorische Endplatte zur Muskelkontraktion übertragen, was den Ablauf von Reiz zu Reaktion und Reflexbögen beschreibt. Zu den neurodegenerativen Erkrankungen zählen Alzheimer, Multiple Sklerose und Parkinson, die mit Funktionsstörungen im Nervensystem einhergehen. | 85 |

### Found best pipeline: Pipeline 0

### Starting Extractor from Section to document

Method finished after 0.03 seconds

### Starting Enricher at document level

Method finished after 4.12 seconds

### Starting Enricher at document level

Method finished after 3.43 seconds

Session evaluator: None
