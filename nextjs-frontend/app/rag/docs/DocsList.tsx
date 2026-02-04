"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  const isMainActive =
    pathname === "/rag"

  return (
    <section>
      <h3 style={{ marginBottom: 12 }}>Documents</h3>

      {/* Main link */}
      <div style={{ marginBottom: 10 }}>
        <Link
          href="/rag"
          style={{
            display: "block",
            padding: "8px 10px",
            borderRadius: 6,
            fontWeight: 600,
            textDecoration: "none",
            background: isMainActive ? "#eee" : "transparent",
          }}
        >
          Main
        </Link>
      </div>

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

        {docs.map((doc) => {
          const href = `/rag/docs/${doc.doc_id}`;
          const isActive = pathname === href;

          return (
            <div
              key={doc.doc_id}
              style={{
                padding: "6px 4px",
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                background: isActive ? "#eee" : "transparent",
                borderRadius: 6,
              }}
            >
              <Link
                href={href}
                style={{
                  textDecoration: "none",
                  color: isActive ? "black" : "#0070f3",
                  cursor: "pointer",
                  fontWeight: isActive ? 600 : 400,
                  padding: "6px 8px",
                  flex: 1,
                }}
              >
                {doc.name}
              </Link>

              <DeleteButton doc_id={doc.doc_id} />
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <UploadButton />
      </div>
    </section>
  );
}
