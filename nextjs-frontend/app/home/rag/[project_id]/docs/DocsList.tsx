"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { UploadButton } from "./DocButtons";
import {
  removeDoc,
  exportDocPipeline,
  listDocPipelines,
  loadDocPipeline,
} from "@/api/rag/docs/docs-action";

import { DocActionsMenu } from "@/../components/custom-ui/DocActions";

type Doc = {
  doc_id: string;
  name: string;
};

function ThemedVerticalScrollbarStyles({ scopeClass }: { scopeClass: string }) {
  return (
    <style>{`
      .${scopeClass} {
        scrollbar-width: thin;
        scrollbar-color:
          color-mix(in srgb, var(--theme-accent-ring) 26%, var(--theme-card-border))
          transparent;
      }

      .${scopeClass}::-webkit-scrollbar {
        width: 8px;
      }

      .${scopeClass}::-webkit-scrollbar-track {
        background: transparent;
        margin-block: 6px;
      }

      .${scopeClass}::-webkit-scrollbar-thumb {
        background: color-mix(
          in srgb,
          var(--theme-card-border) 78%,
          var(--theme-accent-ring) 22%
        );
        border-radius: 9999px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }

      .${scopeClass}:hover::-webkit-scrollbar-thumb {
        background: color-mix(
          in srgb,
          var(--theme-card-border) 58%,
          var(--theme-accent-ring) 42%
        );
      }

      .${scopeClass}::-webkit-scrollbar-corner {
        background: transparent;
      }
    `}</style>
  );
}

export default function DocsList({
  project_id,
  docs,
  error,
}: {
  project_id: string;
  docs: Doc[];
  error?: string | null;
}) {
  const pathname = usePathname();

  const scrollClass = React.useMemo(
    () => `docs-list-scroll-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  const isMainActive = pathname === `/home/rag/${project_id}`;

  return (
    <section>
      <ThemedVerticalScrollbarStyles scopeClass={scrollClass} />

      <div
        style={{
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Link
          href={`/home/rag/${project_id}`}
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            fontWeight: 600,
            textDecoration: "none",
            background: isMainActive ? "#eee" : "transparent",
            color: "var(--theme-doc-title-active)",
            flex: 1,
          }}
        >
          Master
        </Link>
      </div>

      <div
        className={scrollClass}
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
          const href = `/home/rag/${project_id}/docs/${doc.doc_id}`;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <div
              key={doc.doc_id}
              style={{
                padding: "6px 4px",
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: isActive ? "#eee" : "transparent",
                borderRadius: 6,
              }}
            >
              <Link
                href={href}
                style={{
                  textDecoration: "none",
                  color: isActive
                    ? "var(--theme-doc-title-active)"
                    : "var(--theme-doc-title)",
                  cursor: "pointer",
                  fontWeight: isActive ? 600 : 400,
                  padding: "6px 8px",
                  flex: 1,
                }}
              >
                {doc.name}
              </Link>

              <DocActionsMenu
                project_id={project_id}
                doc_id={doc.doc_id}
                doc_name={doc.name}
                removeDoc={removeDoc}
                exportDocPipeline={exportDocPipeline}
                listDocPipelines={listDocPipelines}
                loadDocPipeline={loadDocPipeline}
              />
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <UploadButton projectId={project_id} />
      </div>
    </section>
  );
}