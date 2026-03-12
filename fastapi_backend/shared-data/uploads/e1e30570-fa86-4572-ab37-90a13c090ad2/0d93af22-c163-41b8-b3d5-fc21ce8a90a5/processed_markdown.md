## Databases
- § Hierarchical Databases
- -root node & parent child relations
- -1-to-1 or 1-to-n
- § Network Databases
- -n-to-n
- § Large Zoo of DBTypes:
- -Relational Databases
- · uses structured query language SQL
- -Object Oriented Databases
- -Graph Databases
- -Document Databases
- -No-SQL
## Simplified Schema for relational databases
- § Snowflake Schema
- -higher normalization
- § Star Schema
- -easier to understand
## Data Base Zoo
Database options since the 2000's. Source: Korflatis et. al (2016)
## Requirements on Database Systems
- § ACID Compliance
- -Set of properties of an database
- § CAP  Theorem
- -Properties of an distributed data store
Good for decision making when DBMS needs to be selected
## ETL & ELT
- § Any possible order of
- -Extract, Transform, Load
- § Important for building and using a Data Warehouse
## Data Access in Systems
- § Online Transaction Processing (OLTP)
- -Stable and DBMS are ACID compliant
- -Request often known before
- -Normalized data
- -Low volume
- § Online Analytical Processing (OLAP)
- -Focus on analysis
- -Denormalized , optimized for analytics
- -Mostly read-only requests
## Data Warehouse
Central data base with data from heterogenous sources.
## Data Warehouse
- § 'A Data Warehouse is a subject-oriented, integrated, non-volatile, and time variant collection of data in support of managements decisions' (W. H. Inmon, Building the Data Warehouse, 2nd ed., John Wiley 1996)
- § Subject-Oriented: analyze a particular subject area, e.g. "sales"
- § Integrated: data from multiple data sources
- § Time-Variant: Historical data is kept, that contrasts with a transactions systems
- § Non-volatile: data warehouse will not change, historical data should never be altered
## DW more then a data base
## Data Warehouse
- § Integrate data
- § OLAP (online analytics processing)
- § Optimized for analytics queries
- § Denormalized data
## Data Base
- § Real time data
- § Very efficient
- § OLTP (online transactional processing)
- § Optimized for data modification queries
- § Normalized data
## Data Mart
- § a subject-oriented database designed
- § to meet the needs of a specific group of users
- § often a subsegment of an Enterprise Data Warehouse
- § data access with higher performance then reading from the Data Warehouse
- § can be created from the Data Warehouse or
- § can be the building blocks for a new Data Warehouse
## Advantages of Data Marts
- § Data maintenance: different departments can take responsibility for and control their data
- § Easy setup: the simple design requires less technical knowledge for implementation
- § Analytics: key performance indicators (KPIs) can be easily tracked
- § Easy input: data marts can serve as the foundation for a future enterprise data warehouse project
## Service Layers
- § Many components required for full pipeline
https://panoply.io/uploads/versions /diagram1---x----750-1087x---.jpg
## OTHER CONCEPTS FOR DATA MANAGEMENT
## Goal for today
- § Data Warehouse
- § Data Lake
- § Data Mesh
- § Data Fabric
- -> What is the main difference between those and when to apply which
## Data Lake vs Data Warehouse
The table compares Data Warehouses and Data Lakes across four key dimensions. A Data Warehouse contains processed data, is designed for business users to perform analysis, and is costly to maintain. In contrast, a Data Lake stores raw data, serves data scientists, and offers easy accessibility with lower costs. While Data Warehouses focus on structured, cleaned data ready for reporting and analytics, Data Lakes provide a flexible storage solution for diverse data types without prior processing.
## Data Lake vs Data Warehouse
A data warehouse is characterized by structured and processed data, utilizing a schema-on-write approach where data is organized before storage. It's typically expensive for handling large data volumes and offers less agility with fixed configurations. While it's a mature technology with strong security measures, it's primarily used by business professionals. In contrast, a data lake stores structured, semi-structured, and unstructured raw data with a schema-on-read approach, making it highly agile and easily configurable. Data lakes are designed for low-cost storage solutions and are favored by data scientists and similar professionals, though their security features are still maturing.
https://www.kdnuggets.com/2015/09/data-lake-vs-data-warehouse-key-differences.html
## Data Lake vs Data Warehouse
## Schema-on-write
- § Know your schema before building the data base
- § Fast results
- § Not agile
- § Structured
- § SQL
Schema-on-read
- § Store raw data
- § Slow results
- § Very agile
- § Unstructured
- § NoSQL
## Data Mesh
Zhamak Dehghani , founder of the idea
- 1) domain-oriented decentralized data ownership and architecture
- -derive domain specific policies and guidelines
- 2) data as a product
- -data producer are owner
- 3) self-serve data infrastructure as a platform
- 4) federated computational governance
## Data Mesh by Dehghani
## Data Mesh by Dehghani
## Data Mesh vs. Data Lake
Data Mesh
- § architecture for data governance
- § data lakes can be used
Data Lake
- § cheap storage architecture
## Data Fabric
- § an architectural concept
- § focuses on automating data integration, data engineering and governance in a data value chain
- § is based on the concept of "active metadata'
- § uses knowledge graphs, semantics and AI/ML technology to identify patterns in different types of metadata
- § use these insights to automate and orchestrate the data value chain
- § complements a data mesh and is not mutually exclusive
- § improves the data mesh by creating data products faster, enforcing global governance and making it easier to control the combination of multiple data products.
## Data Fabric vs. Data Mesh
- § Data Mesh
- -distributes responsibility among teams
- -promotes decentralised data management
- § Data Fabric
- -provides a uniform view of the data
- -seamless integration across different systems
## Cloud Solutions
## Data Warehouse
- § Amazon Redshift
- § Google BigQuery
## ETL Tools
- § Stitch
- § Blendo
- § Fivetran
- § AWS Glue
## Data Lakes
- § Amazon S3
- § Azure Blob Storage
## Analytics
- § Tableau
- § Qlik Sense
- § Looker
Download Big Data Solutions Decision Tree at http L/biz-excellence com/2016/08/30/big-data-dt
2
## METADATA
## Metadata
- § is a must
- § connects data with data or services
- § necessary for control and efficiency when processing data
- § required for discovery and access
## Problem
- § meta data is distributed in different places
- § no standard format is used
## Meta Data Types
- § Ownership and Golden Sources metadata
- § Collaborative metadata
- § Data quality metadata
- § Business architecture metadata
- § Technology metadata
- § Semantics metadata
- § BI and analytics metadata
- -not all are always given
- -use central meta data system
## Meta Data
Meta Data should answer (partly):
- § Who created it
- § What is it
- § When was it created
- § How was it generated
- § Where was it created
- § How may it be used
- § Licence
We need to put data into context!
## Meta Data
## Problem
- § 'publication year' or  'pub year' or 'Year'
- § Missing standards
- § Example standard: Dublin Core
- -<xs:element name="title" substitutionGroup="any"/>
- -<xs:element name="creator" substitutionGroup="any"/>
- -<xs:element name="subject" substitutionGroup="any"/>
- -<xs:element name="description" substitutionGroup="any"/>
-
<xs:element name="publisher" substitutionGroup="any"/>
- -<xs:element name="contributor" substitutionGroup="any"/>
- -<xs:element name="date" substitutionGroup="any"/>
- -<xs:element name="type" substitutionGroup="any"/>
- -<xs:element name="format" substitutionGroup="any"/>
- -<xs:element name="identifier" substitutionGroup="any"/>
- -<xs:element name="source" substitutionGroup="any"/>
- -<xs:element name="language" substitutionGroup="any"/>
- -<xs:element name="relation" substitutionGroup="any"/>
- -<xs:element name="coverage" substitutionGroup="any"/>
- -<xs:element name="rights" substitutionGroup="any"/>
https://www.dublincore.org/specifications/dublin-core/dcmi-terms/
## Meta Data
- § Example Publication as BibTex
- -author = {{Peter, H.} and {Bingert, S.} and {Klimchuk, J. A.} and {de Forest, C.} and {Cirtain, J. W.} and {Golub, L.} and {Winebarger, A. R.} and {Kobayashi, K.} and {Korreck, K. E.}},
- -title = {Structure of solar coronal loops: from miniature to large-scale },
- -DOI= "10.1051/0004-6361/201321826",
- -url= "https://doi.org/10.1051/0004-6361/201321826",
- -journal = {A\&A},
- -year = 2013,
- -volume = 556,
- -pages = "A104",
- -month = "",
## Meta Data
- § CERIF - Common European Research Information FormatCERIF is the standard that the EU recommends to its member states for recording information about research activity.
§
- Data PackageThe Data Package specification is a generic wrapper format for exchanging data, consisting of a folder containing data files and a descriptor file.
- § DataCite Metadata SchemaA domain-agnostic list of core metadata properties chosen for the accurate and consistent identification of data for citation and retrieval purposes.
- § DCAT - Data Catalog VocabularyDCAT is an RDF vocabulary designed to facilitate interoperability between data catalogs published on the Web.
- § Dublin CoreA basic, domain-agnostic standard which can be easily understood and implemented, and as such is one of the best known and most widely used metadata standards.
- § OAI-ORE - Open Archives Initiative Object Reuse and ExchangeDefines standards for the description and exchange of aggregations of Web resources.
- § Observations and MeasurementsThis standard specifies an XML implementation for the OGC and ISO Observations and Measurements (O&M) conceptual model, including a schema for Sampling Features.
- § PREMISThe PREMIS (Preservation Metadata: Implementation Strategies) Data Dictionary defines a set of metadata that most repositories of digital objects would need to record and use in order to preserve those objects over the long term.
- § PROVA specification that provides a vocabulary to interchange provenance information.
- § RDF Data Cube VocabularyThe Data Cube vocabulary is a core foundation which supports extension vocabularies to enable publication of other aspects of statistical data flows or other multi-dimensional data sets.
- § Repository-Developed Metadata SchemasSome repositories have decided that current standards do not fit their metadata needs, and so have created their own requirements.
## https://www.dcc.ac.uk/resources/subject-areas/general-research-data
## Meta Data
## § Example Data Package (given as Json-Schema)
## Schema
- · a set of detailed guidelines that describe explicit rules and relationships for each metadata element in a standard
- · is much more technical in nature than standards and provide definitions and guidance focusing on semantics and syntax
## Meta Data
- § With given meta data the described data can be interoperable
- § FAIR principles
- -Findable
- -Accessable
- -Interoperable
- -Reusable
- § The principles emphasise machine-actionability … <> … because humans increasingly rely on computational support to deal with data as a result of the increase in volume, complexity, and creation speed of data.
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
