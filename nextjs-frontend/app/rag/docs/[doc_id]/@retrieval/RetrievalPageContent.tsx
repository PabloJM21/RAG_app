"use client";

import {useEffect, useState} from "react";
import {addRetrievalPipeline, fetchRetrievalPipeline, runExport} from "@/app/api/rag/docs/[doc_id]/retrieval/retrieval-action";
import { fetchLevels } from "@/app/api/rag/docs/[doc_id]/chunking/chunking-action";



type MethodSpec = Record<string, any>;
type PipelineSpec = Partial<MethodSpec>[]

/* ---------- Domain options ---------- */

const RETRIEVER_TYPES = [
  "EmbeddingRetriever",
  "ReasonerRetriever"
] as const;

const RETRIEVER_LEVEL_EXTRA = ["rerank"];

const EMBEDDING_MODELS = ["e5-mistral-7b-instruct", "multilingual-e5-large-instruct", "qwen3-embedding-4b"];

const REASONER_MODELS = ["coder", "thinker", "classifier", "generator", "reasoner"];

const QUERY_TRANSFORM_MODELS = [...REASONER_MODELS, "None"] as const;


/* ---------- Templates ---------- */

const BASE_RETRIEVER_FIELDS = {
  level: "",
  retrieval_amount: "",
  query_transformation_model: ""
};

const EMBEDDING_RETRIEVER_TEMPLATE: MethodSpec = {
  type: "EmbeddingRetriever",
  ...BASE_RETRIEVER_FIELDS,
  embedding_model: ""
};

const REASONER_RETRIEVER_TEMPLATE: MethodSpec = {
  type: "ReasonerRetriever",
  ...BASE_RETRIEVER_FIELDS,
  reasoner_model: ""
};

/* ---------- Component ---------- */

export function RetrievalEditor({
  doc_id,
  methods,
  levels
}: {
  doc_id: string;
  methods: PipelineSpec;
  levels: string[];
}) {
  
  
  const [pipeline, setPipeline] =
    useState<PipelineSpec>(methods);

  const [selectedType, setSelectedType] =
    useState<(typeof RETRIEVER_TYPES)[number]>(
      "EmbeddingRetriever"
    );



  /* ---------------- Helpers ---------------- */

  function updatePipeline(
    index: number,
    key: string,
    value: any
  ) {
    const copy = [...pipeline];
    copy[index] = { ...copy[index], [key]: value };
    setPipeline(copy);
  }

  function deleteMethod(index: number) {
    setPipeline(
      pipeline.filter((_, i) => i !== index)
    );
  }

  function addMethod() {
    const template =
      selectedType === "EmbeddingRetriever"
        ? structuredClone(EMBEDDING_RETRIEVER_TEMPLATE)
        : structuredClone(REASONER_RETRIEVER_TEMPLATE);

    setPipeline([...pipeline, template]);
  }
  
  function isCompleteMethod(
  methods: PipelineSpec
  ): methods is MethodSpec[] {
    return methods.every(
      (method) => typeof method?.type === "string"
    );
  }

  /* ---------------- Field renderer ---------------- */

  function renderValueEditor(
    method: Partial<MethodSpec>,
    index: number,
    key: string,
    value: any
  ) {
    // type is fixed
    if (key === "type") {
      return <span>{String(value)}</span>;
    }

    // level dropdown (+ rerank)
    if (key === "level") {
      return (
        <select
          value={value}
          onChange={(e) =>
            updatePipeline(index, key, e.target.value)
          }
        >
          <option value="">—</option>
          {[...levels, ...RETRIEVER_LEVEL_EXTRA].map(
            (lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            )
          )}
        </select>
      );
    }

    // query_transformation_model → boolean
    if (key === "query_transformation_model") {
      return (
        <select
          value={value}
          onChange={(e) =>
            updatePipeline(index, key, e.target.value)
          }
        >
          <option value="">—</option>
          {QUERY_TRANSFORM_MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      );
    }

    // EmbeddingRetriever → model
    if (
      method.type === "EmbeddingRetriever" &&
      key === "embedding_model"
    ) {
      return (
        <select
          value={value}
          onChange={(e) =>
            updatePipeline(index, key, e.target.value)
          }
        >
          <option value="">—</option>
          {EMBEDDING_MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      );
    }

    // ReasonerRetriever → model
    if (
      method.type === "ReasonerRetriever" &&
      key === "reasoner_model"
    ) {
      return (
        <select
          value={value}
          onChange={(e) =>
            updatePipeline(index, key, e.target.value)
          }
        >
          <option value="">—</option>
          {REASONER_MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      );
    }

    // retrieval_amount + fallback → free text
    return (
      <input
        type="text"
        value={String(value)}
        onChange={(e) =>
          updatePipeline(index, key, e.target.value)
        }
        style={{ width: "100%" }}
      />
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <section>
      <h2>Retrieval</h2>

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
              onClick={() => deleteMethod(index)}
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
                          method,
                          index,
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
          {RETRIEVER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>{" "}
        <button onClick={addMethod}>
          Add method
        </button>
      </div>

      {/* ---------- Save ---------- */}
      <div style={{ marginTop: 12 }}>
        {isCompleteMethod(pipeline) && (
          <form action={addRetrievalPipeline}>

              <input
                type="hidden"
                name="doc_id"
                value={doc_id}
              />

              <input
                type="hidden"
                name="pipeline"
                value={JSON.stringify(pipeline)}
              />
              <button type="submit">
                Save Pipeline
              </button>
          </form>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {isCompleteMethod(pipeline) && (
          <button
            onClick={() => runExport(doc_id)}
            style={{ marginLeft: 8 }}
          >
            Export Pipeline
          </button>
        )}
      </div>

    </section>
  );
}


export default function RetrievalPageContent({ doc_id }: { doc_id: string }) {
  
  const [pipeline, setPipeline] =
    useState<PipelineSpec>([]);
  const [levels, setLevels] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadPipeline() {
      try {
        const pipeline_data = await fetchRetrievalPipeline(doc_id);
        setPipeline(pipeline_data ?? []);
        const levels_data = await fetchLevels(doc_id);
        setLevels(levels_data ?? []);

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
    <RetrievalEditor
      doc_id={doc_id}
      methods={pipeline}
      levels={levels}
    />
  );
}


