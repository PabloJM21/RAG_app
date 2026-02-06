# Starting Retrieval

## Starting Document Pipeline for Document: SoSe2025_Biomedizin-II_Nervensystem.pdf

This Pipeline consists of following methods:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | k1 | b |
| --- | --- | --- | --- | --- | --- | --- |
| BM25Retriever | Chapter | 4 | coder | A paraphrase of this QUERY suited for retrieving text chunks based on the BM25 method, in the same language | 1.5 | 0.75 |



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | reasoner_model |
| --- | --- | --- | --- | --- | --- |
| ReasonerRetriever | Section | 5 | coder | A paraphrase of this QUERY suited for retrieving text chunks based on direct LLM calls, in the same language | thinker |

Starting Document Pipeline

Starting with method:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | k1 | b |
| --- | --- | --- | --- | --- | --- | --- |
| BM25Retriever | Chapter | 4 | coder | A paraphrase of this QUERY suited for retrieving text chunks based on the BM25 method, in the same language | 1.5 | 0.75 |

### Starting query transformation

Query transformed successfully:



| Input Query | Output Query |
| --- | --- |
| Erkläre mir ausführlich die beziehung zwischen Nervensystem und Hormonsystem | Beziehung zwischen Nervensystem und Hormonsystem, Zusammenwirkung, Kommunikation, Regulation, Neuroendokrinologie, Nerven- und Hormonregulation |

### Starting retrieval

Retrieving 4 out of 13 Chunks

Output size: 4 Chunks

Starting with method:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | reasoner_model |
| --- | --- | --- | --- | --- | --- |
| ReasonerRetriever | Section | 5 | coder | A paraphrase of this QUERY suited for retrieving text chunks based on direct LLM calls, in the same language | thinker |

### Starting query transformation

Query transformed successfully:



| Input Query | Output Query |
| --- | --- |
| Erkläre mir ausführlich die beziehung zwischen Nervensystem und Hormonsystem | Detaillierte Erläuterung der Wechselwirkungen zwischen dem Nervensystem und dem Hormonsystem im menschlichen Körper |

### Starting retrieval

Retrieving 5 out of 14 Chunks

Output size: 5 Chunks

Finishing Document Pipeline

## Starting Document Pipeline for Document: SoSe2024_Biomedizin-II_Hormonsystem.pdf

This Pipeline consists of following methods:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | k1 | b |
| --- | --- | --- | --- | --- | --- | --- |
| BM25Retriever | Chapter | 4 | coder | A paraphrase of this QUERY suited for retrieving text chunks based on the BM25 method, in the same language | 1.5 | 0.75 |



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | reasoner_model |
| --- | --- | --- | --- | --- | --- |
| ReasonerRetriever | Section | 5 | coder | A paraphrase of this QUERY suited for retrieving text chunks based on direct LLM calls, in the same language | thinker |

Starting Document Pipeline

Starting with method:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | k1 | b |
| --- | --- | --- | --- | --- | --- | --- |
| BM25Retriever | Chapter | 4 | coder | A paraphrase of this QUERY suited for retrieving text chunks based on the BM25 method, in the same language | 1.5 | 0.75 |

### Starting query transformation

Query transformed successfully:



| Input Query | Output Query |
| --- | --- |
| Erkläre mir ausführlich die beziehung zwischen Nervensystem und Hormonsystem | Beziehung zwischen Nervensystem und Hormonsystem, Zusammenwirkung, Kommunikation, Regulation, Neuroendokrinologie, Nerven- und Hormonregulation |

### Starting retrieval

Retrieving 4 out of 9 Chunks

Output size: 4 Chunks

Starting with method:



| type | level | retrieval_amount | query_transformation_model | query_transformation_prompt | reasoner_model |
| --- | --- | --- | --- | --- | --- |
| ReasonerRetriever | Section | 5 | coder | A paraphrase of this QUERY suited for retrieving text chunks based on direct LLM calls, in the same language | thinker |

### Starting query transformation

Query transformed successfully:



| Input Query | Output Query |
| --- | --- |
| Erkläre mir ausführlich die beziehung zwischen Nervensystem und Hormonsystem | Detaillierte Erläuterung der Wechselwirkungen zwischen dem Nervensystem und dem Hormonsystem im menschlichen Körper |

### Starting retrieval

Retrieving 5 out of 33 Chunks

Output size: 5 Chunks

Finishing Document Pipeline

# Starting Generation Pipeline

This Pipeline consists of following method:



| type | query_transformation_model | query_transformation_prompt | generator_model | generator_prompt |
| --- | --- | --- | --- | --- |
| Generator | coder | A new string matching this QUERY that can be directly combined with some text chunks to provide a RAG answer | thinker | A complete answer to this QUERY based only on the provided CHUNKS |

## Final Results

Generation concluded succesfully obtaining following output:



| Query | Output |
| --- | --- |
| Erkläre mir ausführlich die beziehung zwischen Nervensystem und Hormonsystem | Das Nervensystem und das Hormonsystem bilden die beiden Hauptregulationssysteme des Körpers und arbeiten eng zusammen. Das Nervensystem steuert Vorgänge sehr schnell über elektrische Aktions‑ und Leitungspotenziale, die über Axone und Synapsen von Neuron zu Neuron bzw. zu Effektorzellen (z. B. Muskelzellen) übertragen werden. An den Synapsen können unterschiedliche Neurotransmitter erregend oder hemmend wirken; die Summe aller erregenden und hemmenden Inputs bestimmt, ob ein neues Aktionspotential ausgelöst wird.   Das Hormonsystem wirkt langsamer, weil Hormone erst in den Blutkreislauf freigesetzt und dann zu Zielorganen transportiert werden. Trotz der langsameren Geschwindigkeit erreichen Hormone fast alle Gewebe und regulieren langfristig Prozesse wie Wachstum, Stoffwechsel, Fortpflanzung, Stressreaktionen und das allgemeine Gleichgewicht.   Die enge Verknüpfung beider Systeme erfolgt über die Hypothalamus‑Hypophysen‑Achse. Der Hypothalamus, der als zentrale Verbindung zwischen Nervensystem und Hormonsystem gilt, produziert Releasing‑ und Inhibiting‑Hormone, die die Hypophyse (Hirnanhangdrüse) steuern. Die Hypophyse gibt ihrerseits Hormone an weitere Drüsen ab, die dann Hormone für Wachstum, Stoffwechsel und Stressreaktionen freisetzen.   Stresshormone (z. B. Adrenalin, Noradrenalin, Cortisol) illustrieren die Doppelrolle: Sie wirken sowohl als Neurotransmitter im Nervensystem (schnelle „Fight‑or‑Flight“-Reaktion) als auch als Hormone im Blut. Sie erhöhen Herzfrequenz und Blutdruck (durch Vasokonstriktion), erweitern die Atemwege, mobilisieren Energiereserven (Fettabbau, Glukosefreisetzung) und hemmen die Magen‑Darm‑Aktivität. Andere Hormone, die als Neurotransmitter fungieren, können dagegen vasodilatatorisch wirken, den Blutdruck senken, das Herz‑Schlag‑Volumen erhöhen und die Nierenfunktion steigern.   Zusammengefasst: Das Nervensystem liefert schnelle, präzise Signale über elektrische Impulse und Neurotransmitter, das Hormonsystem liefert langsame, aber breit wirkende Signale über Hormone im Blut. Beide Systeme werden über den Hypothalamus‑Hypophysen‑Komplex koordiniert, wodurch eine feine Abstimmung von akuten Reaktionen (z. B. Stress) und langfristigen Regulationsprozessen (z. B. Wachstum, Stoffwechsel) ermöglicht wird. |



| Sources |
| --- |
| - · Nervensystem und Hormonsystem sorgen für kontrollierte Bedingungen in einem lebenserhaltenden Rahmen. Beide verfolgen dieses Ziel auf sehr unterschiedliche Weisen. - · Nervensystem regelt schnell mithilfe von Nervenimpulsen - · Hormonsystem regelt langsamer, jedoch nicht weniger effektiv, durch Freisetzen von Hormonen - · Nervensystem darüber hinaus auch verantwortlich für Wahrnehmungen, Verhaltensweisen, Emotionen, Erinnerungen, Lernen, Schlaf, löst alle willkürlichen und unwillkürlichen Bewegungen aus. Neurologie: Bereich der Medizin der sich mit der normalen Funktion und Störungen des Nervensystems befasst. -  Wir benötigen eine ganzheitliche und personalisierte Medizin und müssen weg vom Denken in den verschiedenen medizinischen Disziplinen |
| Bei der Informationsaufnahme, -integration und weiterleitung spielen sowohl elektrische als auch biochemische Vorgänge eine Rolle. |
| - · Eine Synapse ist NICHT das Ende eines Axons! - · Eine Synapse ist der Ort der Kommunikation zwischen zwei Nervenzellen oder zwischen einer Nerven- und einer Effektorzelle (z.B. einer Muskelzelle) - · Die Axone bilden knopfartige Kontaktstellen zu den Dendriten des nächsten Neurons, oder aber auch zu einer sonstigen Effektorzelle - · Die chemische Synapse besteht aus - · der präsynaptischen Membran  dies ist die Membran der Nervenzelle am Axonende - · Dem synaptischen Spalt = der Zwischenraum zwischen der prä- und postsynaptischen Zelle - · Der postsynaptischen Membran  diese kann zu einer Nervenzelle oder z.B. einer Muskelzelle gehören |
| - · Es gibt verschiedene Neurotransmitter, die an der postsynaptischen Zelle erregend oder hemmend wirken können. - · Wirken sie erregend, verschiebt sich das Ruhepotential Richtung Schwellenwert und die Wahrscheinlichkeit steigt, dass ein neues Aktionspotential entsteht. - · Wirken sie hemmend, verschiebt sich das Ruhepotential entgegengesetzt zum Schwellenwert und die Wahrscheinlichkeit zum Entstehen eines neues Aktionspotentials sinkt. -  Ein einziges postsynaptisches Neuron erhält Input von vielen präsynaptischen Neuronen. Einige davon sind erregend, andere hemmend. Die Summe all dieser Wirkungen zu einem festgelegten Zeitpunkt bestimmt, ob ein Aktionspotential entsteht oder nicht. |
| Elektrotonische, Nerven- und Muskelaktionspotenziale sind an der Weiterleitung sensorischer Reize, integrativen Funktionen (wie Wahrnehmung) motorischen Abläufen beteiligt. und 100 |
|  - · Hirnanhangdrüse = Hypophyse - · Hypophyse steht unter Kontrolle des Hypothalamus - · Hypothalamus ist die Hauptverbindung zwischen dem Nervensystem und dem Hormonsystem  Wirkung der Hormone aus Hypothalamus und Hypophyse  - · Die produzierten Hormone spielen alle eine wichtige Rolle bei der Regulierung praktisch aller Aspekte - · des Wachstums und der Entwicklung, - · des Stoffwechsels und - · des allgemeinen Gleichgewichts im Körper. - · Hypothalamus kontrolliert darüber hinaus auch Stressreaktionen |
|  - · Stresshormone - · Haben unterschiedliche Rollen als Hormone und Neurotransmitter - · Sind eng verwandt, haben aber zum Teil unterschiedliche physiologische Wirkungen - · Verstärken in großem Maß die 'Fight-and-Flight-Reaktionen' (s. Vorlesungseinheit zum Nervensystem). U.a.: - · Herzfrequenzsteigerung - · Verengung der Blutgefäße und damit Blutdrucksteigerung - · Erweiterung der Atemwege - · Schnelle Bereitstellung von Energiereserven (Fettabbau, Glucosefreisetzung) - · Hemmung der Magen-Darm-Aktivität |
|  |
|  - · Hat unterschiedliche Rollen als Hormon und Neurotransmitter - · Führt zur Erweiterung der Blutgefäße und damit zur Senkung des Blutdrucks (in der Rolle als Hormon) - · Sorgt dafür, dass das Herz pro Schlag mehr Blut pumpt - · Erhöht die Nierenaktivität |
|  |
