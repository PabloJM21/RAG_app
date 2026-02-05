"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronDown } from "lucide-react";

import { UploadButton} from "./DocButtons";
import {removeDoc, exportDocPipeline} from "@/app/api/rag/docs/docs-action";

import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";


import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {ThreeRunActions} from "@/components/custom-ui/SaveRunActions";
import {run} from "@/app/api/rag/main-pipeline/pipeline-action";



type Doc = {
  doc_id: string;
  name: string;
};

function DeleteDropdownItem() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full text-left text-red-500 disabled:opacity-50"
    >
      {pending ? "Loading..." : "Delete"}
    </button>
  );
}

function ExportInlineButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled} size="sm">
      {pending ? "Loading..." : "Export"}
    </Button>
  );
}

export default function DocsList({
  docs,
  error,
}: {
  docs: Doc[];
  error?: string | null;
}) {
  const pathname = usePathname();

  const [openById, setOpenById] = React.useState<Record<string, boolean>>({});
  const [targetBySourceId, setTargetBySourceId] = React.useState<
    Record<string, string>
  >({});

  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  const isMainActive = pathname === "/rag";

  return (
    <section>
      <h3 style={{ marginBottom: 12 }}>Documents</h3>

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
          href="/rag"
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            fontWeight: 600,
            textDecoration: "none",
            background: isMainActive ? "#eee" : "transparent",
            flex: 1, // ← takes all available space
          }}
        >
          Main
        </Link>

        <ThreeRunActions
          runConversion={() => run("conversion")}
          runChunking={() => run("chunking")}
          runRetrieval={() => run("retrieval")}
        />
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

          const isOpen = !!openById[doc.doc_id];

          // choose a target that is not the source
          const fallbackTarget =
            docs.find((d) => d.doc_id !== doc.doc_id)?.doc_id ?? "";

          const selectedTarget = targetBySourceId[doc.doc_id] ?? fallbackTarget;

          const exportDisabled =
            !selectedTarget || selectedTarget === doc.doc_id;

          return (
            <React.Fragment key={doc.doc_id}>
              {/* Row */}
              <div
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
                {/* Collapsible toggle on the left */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();

                    setOpenById((prev) => ({
                      ...prev,
                      [doc.doc_id]: !prev[doc.doc_id],
                    }));

                    // ensure there's always a valid target set (not source)
                    setTargetBySourceId((prev) => {
                      const current = prev[doc.doc_id];
                      if (current && current !== doc.doc_id) return prev;

                      const nextTarget =
                        docs.find((d) => d.doc_id !== doc.doc_id)?.doc_id ?? "";
                      return { ...prev, [doc.doc_id]: nextTarget };
                    });
                  }}
                  aria-label={isOpen ? "Collapse export" : "Expand export"}
                  style={{
                    height: 24,
                    width: 24,
                    borderRadius: 4,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#666",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "0 0 auto",
                  }}
                >
                  {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

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

                {/* Delete dropdown trigger on the right (always visible) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      style={{
                        height: 24,
                        width: 24,
                        borderRadius: 4,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: "#666",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                      }}
                      onClick={(e) => {
                        // don't navigate/select row when opening the menu
                        e.stopPropagation();
                      }}
                      aria-label={`Options for ${doc.name}`}
                    >
                      …
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <form
                        action={async () => {
                          await removeDoc(doc.doc_id);
                        }}
                      >
                        <DeleteDropdownItem />
                      </form>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Export panel below the row (collapsible) */}
              {isOpen && (
                <div
                  style={{
                    padding: "10px 8px 12px 36px", // indent under chevron
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTarget}
                      onChange={(e) =>
                        setTargetBySourceId((prev) => ({
                          ...prev,
                          [doc.doc_id]: e.target.value,
                        }))
                      }
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                    >
                      {docs.map((d) => (
                        <option
                          key={d.doc_id}
                          value={d.doc_id}
                          disabled={d.doc_id === doc.doc_id}
                        >
                          {d.name}
                          {d.doc_id === doc.doc_id ? " (source)" : ""}
                        </option>
                      ))}
                    </select>

                    <form
                      action={async (formData: FormData) => {
                        await exportDocPipeline(formData);
                      }}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="source_id" value={doc.doc_id} />
                      <input
                        type="hidden"
                        name="target_id"
                        value={selectedTarget}
                      />
                      <ExportInlineButton disabled={exportDisabled} />
                    </form>

                    {/* Optional helper when export is impossible */}
                    {docs.length < 2 && (
                      <span className="text-sm text-muted-foreground">
                        Upload another document to export to.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <UploadButton />
      </div>
    </section>
  );
}





