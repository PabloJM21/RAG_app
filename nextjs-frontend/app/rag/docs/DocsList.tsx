// DocsList.tsx
"use client";

import Link from "next/link";
import { UploadButton } from "./UploadButton";
import { DeleteButton } from "./deleteButton";

type Doc = {
  doc_id: string;
  name: string;
};

export default function DocsList({
  docs,
  error,
}: {
  docs: Doc[];
  error?: string | null;
}) {
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
          overflowY: "auto",
        }}
      >
        {docs.length === 0 && (
          <div style={{ color: "#666" }}>No documents uploaded yet</div>
        )}

        {docs.map((doc) => (
          <div
            key={doc.doc_id}
            style={{
              padding: "6px 4px",
              borderBottom: "1px solid #eee",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Link
              href={`/rag/docs/${doc.doc_id}`}
              style={{
                textDecoration: "none",
                color: "#0070f3",
                cursor: "pointer",
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
