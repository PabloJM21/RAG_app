# RAG Pipeline Builder

A tool for designing, executing, and experimenting with **Retrieval-Augmented Generation (RAG)** pipelines that are highly scalable, modular, and customizable.

The application enables users to upload and process multiple documents (PDFs, Word documents, and other supported formats) and interact with them through a unified interface. Its no-code workflow allows both researchers and practitioners to build complex RAG pipelines without requiring programming knowledge.

The system emphasizes experimentation by allowing users to compose different chunking strategies, retrieval mechanisms, and enrichment techniques into reusable pipelines. Pipeline presets further simplify the exploration and comparison of different RAG architectures.

## Features

* **No-code pipeline builder** for creating custom RAG workflows
* **Multi-document support** with independent document pipelines
* **Master pipeline** for global retrieval and answer generation
* **Modular architecture** with interchangeable processing methods
* **Reusable pipeline presets**
* **Customizable interface** including themes and pipeline colors
* **Document conversion** using Docling
* **OCR support** for image-based documents
* **Hierarchical chunking** with recursive pipeline execution
* **SQLite-based storage** for text chunks and vector embeddings

---

## System Overview

The application is divided into two major components:

* **Document Pipelines**, which process each uploaded document independently.
* **Master Pipeline**, which combines information from all processed documents to generate the final response.

This separation enables efficient processing of multiple documents while keeping document-specific preprocessing independent from global retrieval and generation.

---

## Architecture

<p align="center">
  <img src="./nextjs-frontend/public/images/main_diagram.png" width="100%" />
</p>

The backend consists of three major layers:

* **Agents**

  * Chat Assistant APIs
  * Document conversion
  * OCR image processing

* **Data Processing**

  * End-to-end document ingestion
  * Markdown conversion
  * Hierarchical chunk generation
  * Context enrichment
  * Retrieval pipelines

* **Data Storage**

  * SQLite database
  * Text chunks
  * Vector embeddings
  * Metadata storage

---

# Pipeline Architecture

## Master Pipeline

The Master Pipeline performs all operations that involve multiple documents simultaneously. It is responsible for filtering relevant documents, selecting the most useful text chunks, and generating the final answer.

It consists of three configurable components:

### Router

The Router performs document-level filtering.

Instead of consulting every uploaded document, it determines which documents are relevant for the current user query. This reduces unnecessary retrieval and improves efficiency.

### Reranker

The Reranker is applied after document retrieval.

It receives all retrieved chunks from the selected documents and ranks them according to their relevance before they are passed to the language model.

### Generator

The Generator produces the final answer using the filtered chunks.

At this stage, all previous pipelines are assumed to have already extracted the relevant information required to answer the user's query.

---

## Document Conversion

Document Conversion is the first stage of every document pipeline.

Uploaded documents are converted into Markdown format using a backend based on **Docling**. This unified representation simplifies all downstream processing stages.

Supported input formats include PDFs, Word documents, and additional formats supported by Docling.

OCR can be used when processing scanned or image-based documents.

---

## Document Pipelines

Each uploaded document has its own independent processing pipeline.

These pipelines are responsible for converting, processing, enriching, and indexing each document before it becomes available for querying.

The processing consists of four stages:

1. Document Conversion
2. Chunking
3. Enrichment
4. Retrieval

Each stage can contain multiple methods, allowing users to build custom processing workflows.

---



## Chunking

The Chunking stage builds a hierarchy of text chunks through a recursive pipeline.

Users can chain multiple chunkers together, where the output of one chunker becomes the input of the next. This enables hierarchical document representations that preserve structural information.

Two chunking strategies are currently supported.

### Paragraph Chunker

Splits text using configurable separators, allowing chunking around Markdown headings or other document structures.

If `max_words` is left empty, every separator starts a new chunk.

### Sliding Window Chunker

Creates overlapping chunks using a configurable window size.

The `overlap_words` parameter controls how much text is shared between consecutive chunks, helping preserve context across chunk boundaries.

---

## Enrichment

The Enrichment stage adds contextual information that may be missing from isolated text chunks while also reducing oversized chunks.

Instead of modifying the original document directly, enrichment methods operate on the generated chunk hierarchy.

Typical operations include:

* Context sharing between hierarchy levels
* Content rewriting
* Prompt-based transformations
* Filtering
* Resetting content to its original state

These operations are fully configurable through editable prompts.

### Extractor

The Extractor transfers titles or content between hierarchy levels.

For example, chapter titles can be propagated upward to document-level nodes, or parent context can be attached to child chunks.

This enables richer semantic representations that improve retrieval quality.

---

## Retrieval

The Retrieval stage prepares document chunks for efficient semantic search.

Different retrieval methods can be chained together to define how chunks are indexed and later retrieved during querying.

The resulting embeddings are stored inside the SQLite database together with the processed chunk hierarchy.

---


## Enrichment Pipeline

The Enrichment Pipeline enhances the generated chunks by adding contextual information, reducing overly large chunks, and improving the semantic quality of the text before retrieval.

Rather than modifying the original document, enrichment operations are applied to the chunk hierarchy generated during the Chunking stage. Multiple enrichment methods can be chained together, allowing users to create sophisticated processing workflows tailored to their retrieval strategy.

The pipeline is built around two primary operations: **Extractor** and **Enricher**, complemented by additional utility methods for refining the generated content.

### Extractor

The **Extractor** transfers titles or content between different hierarchy levels.

Depending on the selected input and output levels, the extracted information can flow either upward or downward through the hierarchy.

**Parent aggregation**

When the output level is a parent node (for example, the document level), the Extractor iteratively collects the titles or content of all child nodes.

Typical use cases include:

* Building a document overview from chapter titles
* Collecting section summaries into a chapter summary
* Creating document-level context for later processing

**Child contextualization**

When the output level is a child node, the Extractor propagates information from parent chunks to all their descendants.

This enables workflows such as attaching:

* Document summaries to every paragraph
* Chapter titles to every section
* Section context to individual chunks

The extracted content can be:

* Prepended to the current chunk
* Appended to the current chunk
* Used to completely replace the existing content

Optionally, a custom caption (such as **Context:** or **Summary:**) can be inserted before the attached text to clearly distinguish generated context from the original document content.

---

### Enricher

The **Enricher** uses an LLM to transform or augment chunk contents through customizable prompts.

Because prompts are fully editable, the Enricher can be adapted to a wide variety of tasks, including:

* Document summarization
* Chapter summarization
* Keyword extraction
* Hypothetical question generation
* Metadata generation
* Content rewriting
* Domain-specific annotations

Extractor and Enricher methods can be freely combined, enabling users to first aggregate information from large hierarchy levels and then distribute concise contextual summaries to smaller chunks before retrieval.

---

### Filter

The **Filter** removes chunks that should not participate in later processing stages.

Typical filtering operations include:

* Removing empty chunks
* Removing irrelevant chunks
* Discarding chunks that do not match the document topic

This helps reduce noise before embedding and retrieval.

---

### Reseter

The **Reseter** restores chunks to their original state immediately after chunking.

This is particularly useful in workflows where temporary transformations are needed. For example, a user may:

1. Generate summaries from original chunks.
2. Export those summaries to higher hierarchy levels.
3. Restore the original chunks before embedding them.

This allows enrichment pipelines to generate contextual information without permanently modifying the underlying document content.

---

## Chunk Results

The **Chunk Results** view provides an interactive visualization of the hierarchy generated for each document.

Chunks are organized by hierarchy level, where each level is displayed as a separate scrollable panel. Every chunk can be expanded, inspected, and manually edited through the interface.

The displayed hierarchy is automatically updated whenever:

* Chunking is executed
* An enrichment method modifies the hierarchy
* Chunks are manually edited

In addition to the generated hierarchy, every document contains a dedicated **Document** node representing the entire document.

Although initially empty, this node behaves like any other hierarchy level and can be enriched using the same pipeline operations.

A common workflow consists of:

1. Generating a document summary.
2. Storing it in the Document node.
3. Using the Router to determine whether the document should participate in retrieval.

This significantly improves document-level filtering while keeping the retrieval process efficient.

---

# Retrieval Pipeline

The Retrieval Pipeline determines which chunks will ultimately be provided to the language model.

Multiple retrievers can be chained together, forming a hierarchical retrieval strategy in which each retriever filters the candidates passed to the next stage.

For example, a retrieval pipeline may first retrieve the most relevant **chapters**, after which a second retriever searches only within those chapters to retrieve the most relevant **sections**.

This hierarchical filtering substantially reduces the search space while improving retrieval precision.

---

## Common Retriever Configuration

Although different retrievers implement different retrieval strategies, they share several common configuration options.

### Retrieval Amount

Determines the maximum number of chunks returned by the retriever.

This parameter is available for all retrievers except the **Reasoner Retriever**, which can dynamically determine the appropriate number of chunks.

---

### Query Pre-processing

Before retrieval, the user query can optionally be transformed using an LLM.

This feature allows users to:

* Rewrite ambiguous queries
* Expand queries with additional context
* Adapt prompts to specific retrieval strategies

Each retriever provides suggested prompt templates that can be customized according to the application.

---

## Embedding Retriever

The **Embedding Retriever** performs semantic retrieval using dense vector embeddings.

Each chunk and user query is encoded into a shared embedding space. Retrieval is then performed by computing cosine similarity between the query vector and all stored chunk vectors.

The system currently supports several embedding models with different trade-offs between performance, multilingual support, and computational cost:

* **e5-mistral-7b-instruct** — optimized for instruction-following tasks and large contexts.
* **multilingual-e5-large-instruct** — multilingual model supporting cross-language retrieval.
* **qwen3-embedding-4b** — balanced general-purpose embedding model.

The generated embeddings are stored in the vector database during the staging process and reused for subsequent queries.

---

## Reasoner Retriever

The **Reasoner Retriever** delegates chunk selection to a Large Language Model.

Instead of ranking chunks using vector similarity, the LLM receives a set of candidate chunks and decides which ones are most relevant to the current query.

This approach enables more sophisticated reasoning over candidate chunks and allows retrieval decisions based on semantic understanding rather than purely embedding similarity.

Users can select different LLM providers and models depending on the desired balance between reasoning quality, latency, and computational cost.

---

# Pipeline Actions

Certain pipeline stages require explicit execution before the processed data becomes available for retrieval.

## Run Actions

Each document pipeline can be executed independently.

The available actions include:

* Convert document
* Run chunking
* Execute enrichment
* Stage retrieval

The **Stage Retrieval** action prepares the retrieval pipeline for querying.

For embedding-based retrievers, this step computes the vector embeddings and stores them in the database.

The Master Pipeline additionally provides **Global Actions**, allowing users to execute conversion, chunking, and retrieval staging for all documents that have not yet been processed.

This simplifies batch processing of large document collections.

---

## Save, Load and Export

Pipeline configurations can be saved for future use.

Users may also export the complete pipeline configuration of a document under a custom name and later import it into other documents.

This mechanism enables reusable pipeline presets tailored to specific document types, domains, or retrieval tasks, significantly reducing setup time for recurring workflows.





# User Interface

The application provides an intuitive no-code interface for designing RAG pipelines.

Users can:

* Upload multiple documents
* Edit each document's processing pipeline
* Configure the global Master Pipeline
* Save and reuse pipeline presets
* Customize the interface theme
* Assign custom colors to pipeline methods for improved visualization

The left panel displays all uploaded documents, while selecting a document opens its configurable processing pipeline.

---

# Deployment

For deployment architecture, CI/CD, and Azure infrastructure, see:

```
docs/deployment.md
```

---

# Setup

## Installing Required Tools

### 1. uv

The backend uses **uv** for dependency management.

Installation instructions:

https://docs.astral.sh/uv/getting-started/installation/

### 2. Node.js, npm and pnpm

Install Node.js and npm:

https://nodejs.org/en/download/

Then install pnpm:

```bash
npm install -g pnpm
```

---

# Build the Project

## Backend

```bash
cd fastapi_backend
uv sync
```

## Frontend

```bash
cd nextjs-frontend
pnpm install
```

---

# Running the Application

Start the backend:

```bash
make start-backend
```

Start the frontend:

```bash
make start-frontend
```
