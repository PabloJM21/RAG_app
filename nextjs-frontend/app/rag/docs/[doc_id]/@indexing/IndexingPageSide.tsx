"use client";

import { useEffect, useState } from "react";
import { addIndexPipeline, fetchIndexPipeline, runIndexing } from "@/app/rag/api/docs/[doc_id]/indexing/indexing-action";


/* ---------- Domain options ---------- */

const METHOD_TYPES = [
  "Custom",
   "Docling",
] as const;

const BOOLEAN_OPTIONS = ["true", "false"];
const TABLE_OPTIONS = ["drop", "keep", "convert"];

const EMBEDDING_MODELS = [
  "intfloat/e5-mistral-7b-instruct",
  "intfloat/multilingual-e5-large-instruct",
  "Qwen/Qwen3-Embedding-4B",
];

/* ---------- Types (simple approach) ---------- */

type MethodSpec = Record<string, any>;

/** What can come back from the API */
type PipelineSpec = Partial<MethodSpec>;

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
  method?: PipelineSpec;
}) {
  const initialType =
    (method?.type as (typeof METHOD_TYPES)[number]) ??
    "Docling Hierarchical";

  const [selectedType, setSelectedType] =
    useState<(typeof METHOD_TYPES)[number]>(
      initialType
    );

  const [methodSpec, setMethodSpec] =
    useState<MethodSpec>(() => ({
      ...templateFor(initialType),
      ...method
    }));

  useEffect(() => {
    setMethodSpec({
      ...templateFor(selectedType),
      type: selectedType
    });
  }, [selectedType]);

  /* ---------------- Helpers ---------------- */

  function update(key: string, value: any) {
    setMethodSpec({
      ...methodSpec,
      [key]: value
    });
  }

  function isCompleteMethod(
    method: PipelineSpec
  ): method is MethodSpec {
    return typeof method?.type === "string";
  }

  /* ---------------- Field renderer ---------------- */

  function renderEditor(key: string, value: any) {
    if (key === "type") {
      return <span>{value}</span>;
    }

    if (typeof value === "boolean") {
      return (
        <select
          value={String(value)}
          onChange={(e) =>
            update(key, e.target.value === "true")
          }
        >
          {BOOLEAN_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    }

    if (key === "tables") {
      return (
        <select
          value={value}
          onChange={(e) => update(key, e.target.value)}
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
          update(key, e.target.value)
        }
        style={{ width: "100%" }}
      />
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <section>
      <h2>Document Conversion</h2>

      <div style={{ marginBottom: 12 }}>
        <label>
          Method:{" "}
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
          </select>
        </label>
      </div>

      <div
        style={{
          border: "1px solid #ccc",
          padding: 12,
          maxWidth: 420
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%"
          }}
        >
          <tbody>
            {Object.entries(methodSpec).map(
              ([key, value]) => (
                <tr key={key}>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: 6,
                      fontWeight: 600,
                      width: "45%"
                    }}
                  >
                    {key}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: 6
                    }}
                  >
                    {renderEditor(key, value)}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12 }}>
        {isCompleteMethod(methodSpec) && (
          <form action={addIndexPipeline}>
            <input
              type="hidden"
              name="doc_id"
              value={doc_id}
            />

            <input
              type="hidden"
              name="pipeline"
              value={JSON.stringify(methodSpec)}
            />
            <button type="submit">
              Save Method
            </button>
          </form>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {isCompleteMethod(methodSpec) && (
          <button
            onClick={() => runConversion(doc_id)}
            style={{ marginLeft: 8 }}
          >
            Run Conversion
          </button>
        )}
      </div>

    </section>
  );
}

/* ---------- Page ---------- */

export default function IndexingPageSide({ doc_id }: { doc_id: string }) {


  const [pipeline, setPipeline] =
    useState<PipelineSpec>({});
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadPipeline() {
      try {
        const data = await fetchConversionMethod(doc_id);
        setPipeline(data ?? {});
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
    <ConversionEditor
      doc_id={doc_id}
      method={pipeline}
    />
  );
}
