Retrieved 4 out of 4 Chunks

**Starting Section retrieval with ReasonerRetriever**

Retrieved 5 out of 10 Chunks

**Starting Section retrieval with ReasonerRetriever**

Retrieved 5 out of 26 Chunks

**Starting Chapter retrieval with ReasonerRetriever**

Retrieved 2 out of 38 Chunks

**Starting Section retrieval with ReasonerRetriever**

Retrieved 5 out of 23 Chunks

**Starting Section retrieval with ReasonerRetriever**

Retrieved 4 out of 13 Chunks

Sources:



| Chunk | Document | Level | Number | tree |
| --- | --- | --- | --- | --- |
|  Cryptographically secure pseudorandom number generators (CSPRNGs) are a special type of PRNG which possess the following additional property: A CSPRNG is PRNG which is unpredictable . Informally, this means that given n output bits of the key stream si , si + 1 ,..., si + n -1, where n is some integer, it is computationally infeasible to compute the subsequent bits si + n , si + n + 1 ,... . A more exact definition is that given n consecutive bits of the key stream, there is no polynomial time algorithm that can predict the next bit sn + 1 with better than 50% chance of success. Another property of CSPRNG is that given the above sequence, it should be computationally infeasible to compute any preceding bits si -1 , si -2 ,... .  Note that the need for unpredictability of CSPRNGs is unique to cryptography. In virtually all other situations where pseudorandom numbers are needed in computer science or engineering, unpredictability is not needed. As a consequence, the distinction between PRNG and CSPRN and their relevance for stream ciphers is often not clear to non-cryptographers. Almost all PRNG that were designed without the clear purpose of being stream ciphers are not CSPRNGs. ##2.2.2 The One-Time Pad  In the following we discuss what happens if we use the three types of random numbers as generators for the key stream sequence s 0 , s 1 , s 2 ,... of a stream cipher. Let's first define what a perfect cipher should be:  Context: The text explains pseudorandom number generators, introduces cryptographically secure PRNGs and the unconditionally secure one‑time pad, discusses why practical stream ciphers must use CSPRNGs to avoid attacks, and describes linear feedback shift registers (LFSRs) and their maximal‑length properties. | Understanding cryptography a textbook for students and practitioners by Christof Paar, Jan Pelzl.pdf | Section | 37 | {'Understanding cryptography a textbook for students and practitioners by Christof Paar, Jan Pelzl.pdf': {'level_order': ['document', 'Chapter', 'Section'], 'nodes': {'Section': [37, 40, 41, 42, 43], 'Chapter': [5], 'document': [1]}, 'edges': [{'parent_level': 'Chapter', 'parent_num': 5, 'child_level': 'Section', 'child_num': 37}, {'parent_level': 'document', 'parent_num': 1, 'child_level': 'Chapter', 'child_num': 5}, {'parent_level': 'Chapter', 'parent_num': 5, 'child_level': 'Section', 'child_num': 40}, {'parent_level': 'Chapter', 'parent_num': 5, 'child_level': 'Section', 'child_num': 41}, {'parent_level': 'Chapter', 'parent_num': 5, 'child_level': 'Section', 'child_num': 42}, {'parent_level': 'Chapter', 'parent_num': 5, 'child_level': 'Section', 'child_num': 43}]}, 'lec3_Circuits and finite automata.pdf': {'level_order': ['document', 'Section'], 'nodes': {'Section': [1, 2, 14, 16, 17], 'document': [1]}, 'edges': [{'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 1}, {'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 2}, {'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 14}, {'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 16}, {'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 17}]}, 'lec4_Turing machines.pdf': {'level_order': ['document', 'Section'], 'nodes': {'Section': [1, 2, 3, 4, 5], 'document': [1]}, 'edges': [{'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 1}, {'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 2}, {'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 3}, {'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 4}, {'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 5}]}, 'lec13_Randomness.pdf': {'level_order': ['document', 'Section'], 'nodes': {'Section': [7, 8, 10, 12], 'document': [1]}, 'edges': [{'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 7}, {'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 8}, {'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 10}, {'parent_level': 'document', 'parent_num': 1, 'child_level': 'Section', 'child_num': 12}]}} |
