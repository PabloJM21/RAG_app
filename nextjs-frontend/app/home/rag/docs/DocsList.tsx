"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { UploadButton} from "./DocButtons";
import {removeDoc} from "@/app/api/rag/docs/docs-action";


import {ThreeRunActions} from "@/components/custom-ui/SaveRunActions";
import {run} from "@/app/api/rag/main-pipeline/pipeline-action";


import { DocActionsMenu } from "@/components/custom-ui/DocActions"; // your path
import { exportDocPipeline, listDocPipelines, loadDocPipeline } from "@/app/api/rag/docs/docs-action";



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

  const isMainActive = pathname === "/home/rag";

  return (
    <section>
      {/* Main link + global actions */}
      <div
        style={{
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Link
          href="/home/rag"
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            fontWeight: 600,
            textDecoration: "none",
            background: isMainActive ? "#eee" : "transparent",
            flex: 1,
          }}
        >
          Master
        </Link>

        <ThreeRunActions
          runConversion={() => run("conversion")}
          runChunking={() => run("chunking")}
          runRetrieval={() => run("retrieval")}
        />
      </div>

      {/* Docs list */}
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
          const href = `/home/rag/docs/${doc.doc_id}`;
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
              {/* Doc link */}
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

              {/* Actions dropdown on the right */}
              <DocActionsMenu
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
        <UploadButton />
      </div>
    </section>
  );
}





