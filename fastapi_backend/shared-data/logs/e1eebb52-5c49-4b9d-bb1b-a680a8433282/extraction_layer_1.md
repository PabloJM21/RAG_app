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

Removed chunk:

Removed chunk:
 
Sommersemester 2024

Dr. Inga Kraus

Inga.Kraus@med.uni-goettingen.de

INSTITUT FÜR MEDIZINISCHE INFORMATIK

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:
 
- (a) Sagittalschnitt; mediale Ansicht

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:

Removed chunk:
 
Sortieren Sie die Silben und bilden Sie daraus passende Wörter.

Removed chunk:
 
Östro

Hypo

Boten

Adre

Endokri

Hormon

Corti

Mela

Gluca

Diabetes

Prosta

Schild

Pank

gene

physe

stoffe

nalin

nologie

rezeptoren

sol

tonin

gon

mellitus

glandine

drüse

reas

Removed chunk:

Method finished after 26.65 seconds

### Starting Extractor from Section to document

Method finished after 0.14 seconds

### Starting Enricher at document level

Method finished after 3.68 seconds

### Starting Enricher at document level

Method finished after 4.44 seconds

Pipeline Evaluation completed for target level document obtaining an average score of 85.0

Individual Scores



| input_chunk | output_chunk | score |
| --- | --- | --- |
| None | Die Vorlesung behandelt die wichtigsten Hormontypen und deren Wirkungsweise, einschließlich Rezeptoren, Wechselwirkungen und Sekretionskontrolle. Zentral sind die Hormone des Hypothalamus‑Hypophysen‑Komplexes (ADH, Oxytocin). Es werden die Schilddrüsenhormone mit Fokus auf Synthese, Regulation, Wirkung und zugehörige Erkrankungen erläutert. Die Nebennierenhormone (Adrenalin, Noradrenalin, Dopamin, Cortisol, Cortison) sowie die Pankreasinselhormone (Insulin, Glukagon) und deren Bedeutung für Diabetes mellitus Typ 1 und Typ 2 werden beschrieben. Weiter werden die Sexualhormone der Eierstöcke und Hoden (Östrogene, Gestagene, Androgene), das Thymushormon, Prostaglandine und Serotonin behandelt. Zusätzlich wird die Stressreaktion in drei Phasen – Fight‑and‑Flight, Bewältigung und Erschöpfung – erklärt. Abschließend werden die langsamen, systemischen Signale des Hormonsystems den schnellen, zielgenauen Signalen des Nervensystems gegenübergestellt. | 85 |

### Found best pipeline: Pipeline 0

### Starting Filter at Section level

Removed chunk:
 
Soweit nicht anders vermerkt stammen die gezeigten Bilder aus:

Anatomie und Physiologie. G.J. Tortora, B.H. Derrickson. Copyright © 2006 WILEY- VCH Verlag GmbH & Co. KGaA, Weinheim. ISBN 3-527-31547-0

Removed chunk:
 
Füllen Sie die Tabelle über den Vergleich des Nervensystems und des Hormonsystems aus. Schließen Sie dabei aus dem, was Sie beim letzten Mal über das Nervensystem gelernt haben, auf eine mögliche Lösung für das Hormonsystem.

Method finished after 19.78 seconds

### Starting Extractor from Section to document

Method finished after 0.11 seconds

### Starting Enricher at document level

Method finished after 5.71 seconds

### Starting Enricher at document level

Method finished after 3.64 seconds
