"use client";

import {useEffect, useState} from "react";
import {addPipeline, fetchPipeline} from "@/app/rag/api/docs/[doc_id]/retrieval/retrieval-action";
import {fetchLevels} from "@/app/rag/api/docs/[doc_id]/extraction/extraction-action";


type MethodSpec = Record<string, any>;
type PipelineSpec = Partial<MethodSpec>[]

/* ---------- Domain options ---------- */

const RETRIEVER_TYPES = [
  "EmbeddingRetriever",
  "ReasonerRetriever"
] as const;

const RETRIEVER_LEVEL_EXTRA = ["rerank"];

const EMBEDDING_MODELS = [
  "text-embedding-3-large",
  "text-embedding-3-small"
];

/* ---------- Templates ---------- */

const BASE_RETRIEVER_FIELDS = {
  level: "",
  retrieval_amount: "",
  "query-preprocess": false
};

const EMBEDDING_RETRIEVER_TEMPLATE: MethodSpec = {
  type: "EmbeddingRetriever",
  ...BASE_RETRIEVER_FIELDS,
  model: ""
};

const REASONER_RETRIEVER_TEMPLATE: MethodSpec = {
  type: "ReasonerRetriever",
  ...BASE_RETRIEVER_FIELDS
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

  /* ---------------- API actions ---------------- */

  async function save() {
    await fetch(`/api/docs/${doc_id}/retrieval/methods`, {
      method: "PUT",
      body: JSON.stringify(methodList),
      headers: { "Content-Type": "application/json" }
    });
  }

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

    // query-preprocess → boolean
    if (key === "query-preprocess") {
      return (
        <select
          value={String(value)}
          onChange={(e) =>
            updatePipeline(
              index,
              key,
              e.target.value === "true"
            )
          }
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    // EmbeddingRetriever → model
    if (
      method.type === "EmbeddingRetriever" &&
      key === "model"
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
          <form action={addPipeline}>

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



    </section>
  );
}


export default async function RetrievalPage({
  params
}: {
  params: { doc_id: string };
}) {
  
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
        const pipeline_data = await fetchPipeline(params.doc_id);
        setPipeline(pipeline_data ?? []);
        const levels_data = await fetchLevels(params.doc_id);
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
      doc_id={params.doc_id}
      methods={pipeline}
      levels={levels}
    />
  );
}


