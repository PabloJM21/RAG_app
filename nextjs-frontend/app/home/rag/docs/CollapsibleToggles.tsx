

{/*

type DocsCollapsibleListProps = {
  docs: Doc[];
  pathname: string;

  openById: Record<string, boolean>;
  setOpenById: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  targetBySourceId: Record<string, string>;
  setTargetBySourceId: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  removeDoc: typeof removeDoc;
  exportDocPipeline: typeof exportDocPipeline;

  ExportInlineButton: React.ComponentType<{ disabled?: boolean }>;
};

export function DocsCollapsibleExportList({
  docs,
  pathname,
  openById,
  setOpenById,
  targetBySourceId,
  setTargetBySourceId,
  removeDoc,
  exportDocPipeline,
  ExportInlineButton,
}: DocsCollapsibleListProps) {
  return (
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
        const isOpen = !!openById[doc.doc_id];

        // choose a target that is not the source
        const fallbackTarget =
          docs.find((d) => d.doc_id !== doc.doc_id)?.doc_id ?? "";

        const selectedTarget = targetBySourceId[doc.doc_id] ?? fallbackTarget;

        const exportDisabled = !selectedTarget || selectedTarget === doc.doc_id;

        return (
          <React.Fragment key={doc.doc_id}>
            // Row
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
              // Collapsible toggle on the left
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

              // Doc link
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

              // Delete dropdown trigger on the right (always visible)
              <DeleteDocActions
                doc_id={doc.doc_id}
                doc_name={doc.name}
                removeDoc={removeDoc}
              />
            </div>

            // Export panel below the row (collapsible)
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
                    <input type="hidden" name="target_id" value={selectedTarget} />
                    <ExportInlineButton disabled={exportDisabled} />
                  </form>

                  // Optional helper when export is impossible
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
  );
}

*/}


