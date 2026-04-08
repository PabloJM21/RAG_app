<div style="position: relative;">

<!-- Background Image -->

<p align="center">
  <img src="./nextjs-frontend/public/images/Homepage.png" alt="Try RAGain Homepage" width="100%" />
</p>

<!-- Foreground Content -->

<div style="position: relative; z-index: 1; padding: 20px;">

## Try RAGain

<p align="center">
    <em>Create, manage, and interact with RAG pipelines across multiple document formats.</em>
</p>

---

Try RAGain is a tool designed to simplify the creation and interaction with Retrieval-Augmented Generation (RAG) pipelines. It enables users to upload and work with multiple documents—such as PDFs, Word files, and other formats supported by the Docling API—and seamlessly query them through a unified interface.

Built with a modern full-stack architecture, Try RAGain provides a scalable environment for experimenting with and deploying RAG-based applications.

### Key features

✔ Multi-document support – Upload and process PDFs, Word files, and other formats supported by the Docling API.

✔ RAG pipeline management – Easily create, configure, and interact with multiple RAG pipelines.

✔ End-to-end type safety – Strong typing across frontend and backend for reliable data handling.

✔ Developer-friendly – Clean architecture and modern tooling for rapid development and iteration.

---

## Technology stack

This project uses a modern set of technologies:

* FastAPI – High-performance backend for building APIs.
* Next.js – React framework for building the frontend.
* TypeScript – Type-safe frontend development.
* UV – Python dependency management.
* pnpm – Fast package manager.

---

## Setup

### Installing Required Tools

#### 1. uv

`uv` is used to manage Python dependencies in the backend. Install it by following the official guide:
https://docs.astral.sh/uv/getting-started/installation/

#### 2. Node.js, npm, and pnpm

To run the frontend, ensure Node.js and npm are installed:
https://nodejs.org/en/download/

After that, install pnpm globally:

```bash
npm install -g pnpm
```

---

## Build the Project

To set up the project locally:

### Backend

Navigate to the `fastapi_backend` directory and run:

```bash
uv sync
```

### Frontend

Navigate to the `nextjs-frontend` directory and run:

```bash
pnpm install
```

---

## Running the Application

Start the FastAPI server:

```bash
make start-backend
```

Start the Next.js development server:

```bash
make start-frontend
```

</div>
</div>
