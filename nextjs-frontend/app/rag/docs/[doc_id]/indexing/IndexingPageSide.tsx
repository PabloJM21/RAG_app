"use client";

import { useEffect, useState } from "react";
import { addConversionPipeline, fetchConversionPipeline, runConversion } from "@/app/api/rag/docs/[doc_id]/conversion/conversion-action";
import { RunButton } from "@/components/custom-ui/RunButton"
import { SaveButton } from "@/components/custom-ui/SaveButton"
/* ---------- Domain options ---------- */

const METHOD_TYPES = [
  "Custom",
   "Docling",
] as const;

const BOOLEAN_OPTIONS = ["true", "false"];
const TABLE_OPTIONS = ["drop", "keep", "convert"];



/* ---------- Types (simple approach) ---------- */

type MethodSpec = Record<string, any>;



/* ---------- Templates ---------- */

const CUSTOM_TEMPLATE: MethodSpec = {
  type: "Custom Conversion",
  do_ocr: false,
  tables: "",
};

const DOCLING_TEMPLATE: MethodSpec = {
  type: "Docling Conversion",
  do_ocr: false,
  do_tables: false,

};






function templateFor(
  type: (typeof METHOD_TYPES)[number]
): MethodSpec {
  switch (type) {
    case "Custom":
      return structuredClone(CUSTOM_TEMPLATE);
    case "Docling":
      return structuredClone(DOCLING_TEMPLATE);
    default:
      return {};
  }
}

/* ---------- Component ---------- */

export function ConversionEditor({
  doc_id,
  method
}: {
  doc_id: string;
  method: MethodSpec[];
}) {
  // Pipeline is always an array, but max length = 1
  const [pipeline, setPipeline] = useState<MethodSpec[]>(method);


  const [selectedType, setSelectedType] =
    useState<(typeof METHOD_TYPES)[number]>(
      "Custom"
    );

  /* ---------------- Helpers ---------------- */

  function updateMethod(key: string, value: any) {
    if (pipeline.length === 0) return;
    const updated = { ...pipeline[0], [key]: value };
    setPipeline([updated]);
  }

  function deleteMethod() {
    setPipeline([]);
  }

  function addMethod() {
    const template = structuredClone(templateFor(selectedType));
    setPipeline([
      {
        ...template,
        type: selectedType
      }
    ]);
  }

  function isCompleteMethod(
    pipeline: MethodSpec[]
  ): pipeline is MethodSpec[] {
    return (
      pipeline.length === 1 &&
      typeof pipeline[0]?.type === "string"
    );
  }

  /* ---------------- Field renderer ---------------- */

  function renderValueEditor(
    key: string,
    value: any
  ) {
    if (key === "type") {
      return <span>{String(value)}</span>;
    }

    if (typeof value === "boolean") {
      return (
        <select
          value={String(value)}
          onChange={(e) =>
            updateMethod(key, e.target.value === "true")
          }
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (key === "tables") {
      return (
        <select
          value={value}
          onChange={(e) => updateMethod(key, e.target.value)}
        >
          <option value="">—</option>
          {TABLE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        value={String(value)}
        onChange={(e) =>
          updateMethod(key, e.target.value)
        }
        style={{ width: "100%" }}
      />
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <section>
      <h2>Document Conversion</h2>

      {/* ---------- Methods row ---------- */}
      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 8
        }}
      >
        {pipeline.map((method, index) => (
          <div
            key={index}
            style={{
              position: "relative",
              border: "1px solid #ccc",
              padding: 8,
              minWidth: 260
            }}
          >
            {/* ❌ Delete */}
            <button
              onClick={deleteMethod}
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                border: "none",
                background: "transparent",
                cursor: "pointer"
              }}
            >
              ❌
            </button>

            <table
              style={{
                borderCollapse: "collapse",
                width: "100%"
              }}
            >
              <tbody>
                {Object.entries(method).map(
                  ([key, value]) => (
                    <tr key={key}>
                      <td
                        style={{
                          borderBottom:
                            "1px solid #eee",
                          padding: 4,
                          fontWeight: 600
                        }}
                      >
                        {key}
                      </td>
                      <td
                        style={{
                          borderBottom:
                            "1px solid #eee",
                          padding: 4
                        }}
                      >
                        {renderValueEditor(
                          key,
                          value
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* ---------- Add method ---------- */}
      <div style={{ marginTop: 12 }}>
        <select
          value={selectedType}
          onChange={(e) =>
            setSelectedType(
              e.target.value as any
            )
          }
        >
          {METHOD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>{" "}
        <button onClick={addMethod}>
          {pipeline.length === 0
            ? "Add method"
            : "Replace method"}
        </button>
      </div>

      {/* ---------- Actions ---------- */}
      <div style={{ marginTop: 12 }}>
        {isCompleteMethod(pipeline) && (
          <form action={addConversionPipeline}>
            <input
              type="hidden"
              name="doc_id"
              value={doc_id}
            />

            <input
              type="hidden"
              name="pipeline"
              value={JSON.stringify(pipeline[0])}
            />
            <SaveButton label="Method"/>
          </form>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {isCompleteMethod(pipeline) && (
          <form action={runConversion}>
            <input
              type="hidden"
              name="doc_id"
              value={doc_id}
            />
            <RunButton label="Method"/>
          </form>
        )}
      </div>
    </section>
  );
}


/* ---------- Page ---------- */

export default function IndexingPageSide({ doc_id }: { doc_id: string }) {


  const [methodSpec, setMethodSpec] =
    useState<MethodSpec>({});
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadPipeline() {
      try {
        const data = await fetchConversionPipeline(doc_id);
        setMethodSpec(data ?? {});
      } catch (err: any) {
        setError(err.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadPipeline();
  }, []);

  if (loading) return <div>Loading pipeline…</div>;
  if (error)
    return (
      <div style={{ color: "red" }}>
        Error: {error}
      </div>
    );

  return (
    <ConversionEditor doc_id={doc_id} method={[methodSpec]} />
  );
}
