"use client";

import Link from "next/link";
import {UploadButton} from "./UploadButton";
import { useActionState } from "react"; // if really needed
import {DeleteButton} from "./deleteButton";
import {fetchDocs} from "@/app/rag/api/docs/docs-action";
import { useState, useEffect } from "react";


type Doc = {
  doc_id: string;
  name: string;
};

export default function DocsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    async function loadDocs() {
        try {
            const data = await fetchDocs();

            // If fetchDocs returns null, set empty array
            setDocs(data ?? []);

        } catch (err: any) {
            console.error("Failed to fetch docs", err);
            setError(err.message ?? "Unknown error");
        } finally {
            setLoading(false);
        }
    }
    loadDocs();
  }, []);

  if (loading) return <div>Loading documents…</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return (
    <section>
      <h3 style={{ marginBottom: 12 }}>Documents</h3>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 4,
          padding: 8,
          maxHeight: "70vh",
          overflowY: "auto"
        }}
      >
        {docs.length === 0 && (
          <div style={{ color: "#666" }}>
            No documents uploaded yet
          </div>
        )}

        {docs.map((doc) => (
          <div
            key={doc.doc_id}
            style={{
              padding: "6px 4px",
              borderBottom: "1px solid #eee"
            }}
          >
            <Link
              href={`/rag/docs/${doc.doc_id}`}
              style={{
                textDecoration: "none",
                color: "#0070f3",
                cursor: "pointer"
              }}
            >
              {doc.name}
            </Link>

            <DeleteButton doc_id={doc.doc_id} />

          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
          <UploadButton />
      </div>
    </section>
  );
}