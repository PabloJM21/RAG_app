## Data Lake vs Data Warehouse
A data warehouse is characterized by structured and processed data, utilizing a schema-on-write approach where data is organized before storage. It's typically expensive for handling large data volumes and offers less agility with fixed configurations. While it's a mature technology with strong security measures, it's primarily used by business professionals. In contrast, a data lake stores structured, semi-structured, and unstructured raw data with a schema-on-read approach, making it highly agile and easily configurable. Data lakes are designed for low-cost storage solutions and are favored by data scientists and similar professionals, though their security features are still maturing.
https://www.kdnuggets.com/2015/09/data-lake-vs-data-warehouse-key-differences.html
## Data Mesh by Dehghani
## Data Fabric
- § an architectural concept
- § focuses on automating data integration, data engineering and governance in a data value chain
- § is based on the concept of "active metadata'
- § uses knowledge graphs, semantics and AI/ML technology to identify patterns in different types of metadata
- § use these insights to automate and orchestrate the data value chain
- § complements a data mesh and is not mutually exclusive
- § improves the data mesh by creating data products faster, enforcing global governance and making it easier to control the combination of multiple data products.
## Metadata
- § is a must
- § connects data with data or services
- § necessary for control and efficiency when processing data
- § required for discovery and access
## Problem
- § meta data is distributed in different places
- § no standard format is used
## Meta Data
- § With given meta data the described data can be interoperable
- § FAIR principles
- -Findable
- -Accessable
- -Interoperable
- -Reusable
- § The principles emphasise machine-actionability … <> … because humans increasingly rely on computational support to deal with data as a result of the increase in volume, complexity, and creation speed of data.
## META DATA
## Consequences - FAIR
## F indable
F1. (meta)data are assigned a globally unique and eternally persistent identifier
- F2. data are described with rich metadata
- F3. (meta)data are registered or indexed in a searchable resource
- F4. metadata specify the data identifier
## Consequences - FAIR
## A ccessible
- A1.  (meta)data are retrievable by their identifier using a standardized communications protocol
- A1.1. the protocol is open, free, and universally implementable
- A1.2. the protocol allows for an authentication and authorization procedure, where necessary
- A2. metadata are accessible , even when the data are no longer available
## Consequences - FAIR
## I nteroperable
- I1. (meta)data use a formal , accessible, shared, and broadly applicable language for knowledge representation
- I2. (meta)data use vocabularies that follow FAIR principles
- I3. (meta)data include qualified references to other (meta)data
## Consequences - FAIR
## R e-usable
R1. meta(data) have a plurality of accurate and relevant attributes R1.1. (meta)data are released with a clear and accessible data usage license
- R1.2. (meta)data are associated with their provenance
- R1.3. (meta)data meet domain-relevant community standards
## Meaning of words
- § Controlled Vocabular
- -a carefully selected list of words and phrases, which are used to tag units of information
- § Taxonomies
- -a controlled vocabulary with a hierarchical structure
- § Thesauri
- -terms have relationships to each other.
- § Ontologies
- -Large thesaurus
## Controlled Vocabular
- § predefined and authorized terms
- § preselected
- § reduce ambiguities of natural language
- § simple lists or complex taxonomies / thesauri
- -if relation between terms exist
- § Can be used to
- -enable consistent indexing
- -improve the retrievability of documents
- -help to make searches more precise
- -serve to understand the contents of a domain
- -support interoperability
## Taxonomies
Taxonomies are based on the general principles of classification:
- § Structure of a subject area
- § hierarchy formation
- § Subordination of the specific to the general
- § Ranking of subordinate terms
## Thesaurus
Thesauri
- § support consistent indexing
- § facilitate the retrieval of index terms or search terms
- § enable an expansion of the search
- § store knowledge about the subject area
- § serve interoperability
## Types of Vocabularies
The table presents a comparison across four different categories: 'List of Words,' 'Taxonomy,' 'Thesaurus,' and 'Ontology.' Under 'Control of the terms,' it shows hierarchical relations, indicating how terms are organized in a structured manner. The taxonomy section highlights control of terms and hierarchical relations, while the thesaurus also includes these elements. In contrast, the ontology column appears to be empty, suggesting no specific information is provided for that category.
## Linked Data
## By Tim Burners Lee
- § Uniform Resource Identifiers (URIs) should be used to name and identify individual things.
- § HTTP URIs should be used to allow these things to be looked up, interpreted, and subsequently "dereferenced".
- § Useful information about what a name identifies should be provided through open standards such as RDF, SPARQL, etc.
- § When publishing data on the Web, other things should be referred to using their HTTP URI-based names.
## Linked Data II
## Also T. B. Lee
- § All conceptual things should have a name starting with HTTP.
- § Looking up an HTTP name should return useful data about the thing in question in a standard format.
- § Anything else that that same thing has a relationship with through its data should also be given a name beginning with HTTP.
## Signposting
- § '… is an approach to make the scholarly web more friendly to machines' signposting.org
- § Can be used in HTTP Headers
- § List of defined relation types:
- -https://www.iana.org/assignments/linkrelations/link-relations.xhtml
Server:
Apache-Coyote/1.1
Vary:
Accept
Location: http://ww.dlib.org/dlib/november1s/vandesompel/llvandesompel.html
Link: <http:l/orcid.org/0000-0002-0715-6126> rel="author"
<http:/lorcid.org/0000-0003-3749-8116> rel="author"
Expires:
Tue, 31 2016 17:18:50 GMT May
Content-Type:
text/html;charset-utf-8
Content-Length:
217
Date:
Tue, 31 2016 16:38:15 GMT May
Connection:
keep-alive
## PERSISTENT IDENTIFIER
## Persistent Identifiers
## A PID is a
- § standard, invariant and long-term reference
- § of a digital resource
- § regardless of status location or current owner
- § Identifiers are commonly, everywhere used
- § Passports
- § Bank account numbers
§
…
- § Which ID Systems do you know?
## Examples
- § Bar-Codes
- § QR-Codes
Wikipedia
- § ISBN
- § DOI https://www.doi.org
- § PID http://www.pidconsortium.eu
- § ARK https://confluence.ucop.edu/display/Curation/ARK
- § Purl https://archive.org/services/purl/
## Identifier Systems
- · ARK
- · arXiv
- · PURL
- · BIBCODE
- · EAN-13
- · eISSN
- · IGSN
- · ISSN
- · ISTC
- · IISSN
- · LSID
- · PMID
- · UPC
- · Handle
- · DOI
- · URN
- · URL
- · URI
- · RoR
- · RAID
- · ORCID
·
……
## Actionable IDs
From:
A Persistent Identifier (PID) policy for the European Open Science Cloud (doi: 10.2777/926037)
## Machine Actionable:
- § Machine Actionable means that a formal statement is syntactically and semantically specified enabling computing systems to carry out automatic processing.
## URLs
- § We use URLs e.g. www.google.com in our daily life
- § URL: Uniform Resource Locater are a subset of URIs (Uniform Resource Identifier)
https://max:muster@www.example.com:8080/i ndex.html?p1=A&p2=B#ressource
- § Defined by RFC 3986 https://tools.ietf.org/html/rfc3986
## URLs and DNS
- § URLs have to be translated to IP adresse in order to find the server
- § Domain Name System translates to IPs www.google.com
- § Or from the slides:
www.intel.de/content/www/de/de/big-data/bigdata-101-animation.html
Problem: URLs often change!!!
## Problem Statement
- § Data is referenced with an URL
## Problem Statement
- § Data is referenced with an URL
## Problem Statement
## Problem Statement
## Problem Statement
## Persitent Identifier
- § We need a stable reference to a resource
- § The reference does not need to be human readable
- § A Persistent Identifier points to a resource
PID:
21.11101/1234567
Points to
http://www.gwdg.de/file
file
## DOI Example
Issue
A8A
Volume 530, June 2011
Article Number
A112
Number of page(s)
12
Section
The Sun
DOI
https:/ /doi org/ 10.1051/0004-6361/201016019
Published online
20 May 2011
## Use Case
- § Defined interface between reference and object
- § The reference is resolved by the PID Service, which gives the address of the PIDs objects actual position
- § If the object does not exist anymore, this also can be given inside the PID
- § Additional of additional Services are possible
## Sustainability by technology
- § Management and resolving of PIDs must be guaranteed for a long period of time
- § The PID System must be
- -reliable
- -robust
- -and operational on long term perspective
- § Many organisation use well tested systems:
- -Handle, DOI, URN, ARK ...
- -Example: PIDs of ePIC
## Handle System ©
- · World wide system to create, update and resolve PIDs
- · It consists of two parts:
- · the registration of prefixes and
- · the software
- · HANDLE.NET Software v9
- · Managed by Digital Object Numbering Authority (DONA)
- · Non-profit Organisation for the administration of the handle system
- · Multi-Primary Administrator (MPA)
- · currently 9
- · each responsible for a specific name space
- § To enforce specific policies (e.g. no-delete)
- § REST API
- § Documentation
- -http://doc.pidconsortium.eu
- § Free choice of suffix structure
- § Distributed system of primaries and mirrors for high availability service
## ePIC Webformular
## ePIC PID vs. DOI
- · ePIC PID and DOI are based on handles.
- · Both, ePIC PID and DOI can be resolved globally without knowledge of the home institution.
- · Neither ePIC PID nor DOI can be deleted.
- · Handles can be deleted
- · matter of policies of ePIC and DOI
- · Difference: DOI
- · redirects to landing page
- · Meta data in a separate data base
