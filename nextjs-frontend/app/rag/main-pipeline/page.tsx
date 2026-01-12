"use client";

import { fetchPipeline, addPipeline } from "@/app/rag/api/main-pipeline/pipeline-action";
import { useState, useEffect } from "react";

/* ---------- Types ---------- */

type MethodSpec = Record<string, any>;
type PipelineSlot = "router" | "reranker" | "generator";
type PipelineSpec = Partial<Record<PipelineSlot, MethodSpec>>;

/* ---------- Domain options ---------- */

const RETRIEVER_TYPES = [
  "EmbeddingRetriever",
  "ReasonerRetriever",
] as const;

const RETRIEVER_LEVELS = ["section", "chapter", "document"];

const EMBEDDING_MODELS = [
  "text-embedding-3-large",
  "text-embedding-3-small",
];

const GENERATOR_MODELS = ["gpt-4.1", "gpt-4.1-mini"];

/* ---------- Templates ---------- */

const BASE_RETRIEVER_FIELDS = {
  retrieval_amount: "",
  "query-preprocess": false,
};

const EMBEDDING_RETRIEVER_TEMPLATE: MethodSpec = {
  type: "EmbeddingRetriever",
  level: "",
  ...BASE_RETRIEVER_FIELDS,
  model: "",
};

const REASONER_RETRIEVER_TEMPLATE: MethodSpec = {
  type: "ReasonerRetriever",
  ...BASE_RETRIEVER_FIELDS,
};

const GENERATOR_TEMPLATE: MethodSpec = {
  type: "Generator",
  model: "",
};

/* ---------- Layout config ---------- */

const COLUMNS: { key: PipelineSlot; label: string }[] = [
  { key: "router", label: "Router" },
  { key: "reranker", label: "Reranker" },
  { key: "generator", label: "Generator" },
];

/* ---------- Component ---------- */

export function MainPipelineEditor({
  initialPipeline,
}: {
  initialPipeline: PipelineSpec;
}) {
  const [pipeline, setPipeline] =
    useState<PipelineSpec>(initialPipeline);

  const [pendingType, setPendingType] = useState<
    Partial<Record<PipelineSlot, string>>
  >({});

  /* ---------- Helpers ---------- */

  function setSlot(
    slot: PipelineSlot,
    method: MethodSpec | null
  ) {
    setPipeline((prev) => {
      const copy = { ...prev };
      if (method === null) {
        delete copy[slot];
      } else {
        copy[slot] = method;
      }
      return copy;
    });
  }

  function updateField(
    slot: PipelineSlot,
    key: string,
    value: any
  ) {
    setPipeline((prev) => {
      if (!prev[slot]) return prev;
      return {
        ...prev,
        [slot]: {
          ...prev[slot]!,
          [key]: value,
        },
      };
    });
  }

  function createRetriever(type: string) {
    return type === "EmbeddingRetriever"
      ? structuredClone(EMBEDDING_RETRIEVER_TEMPLATE)
      : structuredClone(REASONER_RETRIEVER_TEMPLATE);
  }

  function isCompletePipeline(
    pipeline: PipelineSpec
  ): pipeline is Record<PipelineSlot, MethodSpec> {
    return (
      pipeline.router?.type === "string" &&
      pipeline.reranker?.type === "string" &&
      pipeline.generator?.type === "string"
    );
  }

  /* ---------- Run ---------- */



  /** async function run(path: string) {
    await fetch(`/api/main-pipeline/${path}/run`, {
      method: "POST",
    });
  }
   */

  /* ---------- Field renderer ---------- */

  function renderField(
    slot: PipelineSlot,
    key: string,
    value: any
  ) {
    if (key === "type") return <b>{value}</b>;

    if (key === "query-preprocess") {
      return (
        <select
          value={String(value)}
          onChange={(e) =>
            updateField(
              slot,
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

    if (key === "level") {
      return (
        <select
          value={value}
          onChange={(e) =>
            updateField(slot, key, e.target.value)
          }
        >
          <option value="">—</option>
          {RETRIEVER_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>
      );
    }

    if (key === "model") {
      const models =
        pipeline[slot]?.type === "Generator"
          ? GENERATOR_MODELS
          : EMBEDDING_MODELS;

      return (
        <select
          value={value}
          onChange={(e) =>
            updateField(slot, key, e.target.value)
          }
        >
          <option value="">—</option>
          {models.map((m) => (
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
          updateField(slot, key, e.target.value)
        }
      />
    );
  }

  /* ---------- Render ---------- */

  return (
    <section>
      <h2>Main Pipeline</h2>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                style={{ borderBottom: "1px solid #ccc" }}
              >
                {c.label}
              </th>
            ))}
            <th />
          </tr>
        </thead>

        <tbody>
          <tr>
            {COLUMNS.map(({ key: slot }, idx) => (
              <td
                key={slot}
                style={{
                  verticalAlign: "top",
                  padding: 8,
                  borderRight:
                    idx < COLUMNS.length - 1
                      ? "1px solid #eee"
                      : undefined,
                }}
              >
                {/* Selector */}
                {slot !== "generator" && (
                  <>
                    <select
                      value={pendingType[slot] ?? ""}
                      onChange={(e) =>
                        setPendingType({
                          ...pendingType,
                          [slot]: e.target.value,
                        })
                      }
                    >
                      <option value="">—</option>
                      {RETRIEVER_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() =>
                        setSlot(
                          slot,
                          createRetriever(
                            pendingType[slot]!
                          )
                        )
                      }
                    >
                      add
                    </button>
                  </>
                )}

                {slot === "generator" && (
                  <button
                    onClick={() =>
                      setSlot(
                        slot,
                        structuredClone(GENERATOR_TEMPLATE)
                      )
                    }
                  >
                    addGenerator
                  </button>
                )}

                {/* Method box */}
                {pipeline[slot] && (
                  <div
                    style={{
                      marginTop: 8,
                      border: "1px solid #ccc",
                      padding: 8,
                      position: "relative",
                    }}
                  >
                    <button
                      onClick={() => setSlot(slot, null)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                      }}
                    >
                      ❌
                    </button>

                    {Object.entries(pipeline[slot]!).map(
                      ([key, value]) => (
                        <div key={key}>
                          <b>{key}</b>
                          <div>
                            {renderField(slot, key, value)}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </td>
            ))}

            <td style={{ verticalAlign: "top" }}>
              {isCompletePipeline(pipeline) && (
                <form action={addPipeline}>
                  <input
                    type="hidden"
                    name="pipeline"
                    value={JSON.stringify(pipeline)}
                  />
                  <button type="submit">Save</button>
                </form>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/*
      <div style={{ marginTop: 16 }}>
        <button onClick={() => run("indexing")}>
          runIndexing
        </button>{" "}
        <button onClick={() => run("extraction")}>
          runExtraction
        </button>{" "}
        <button onClick={() => run("embeddings")}>
          runEmbeddings
        </button>
      </div>
      */}

    </section>
  );
}

/* ---------- Main Page ---------- */

export default function MainPipelinePage() {

  const [pipeline, setPipeline] = useState<PipelineSpec>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPipeline() {
      try {
        const data = await fetchPipeline();
        // Default to empty object if fetchPipeline returns null/undefined
        setPipeline(data ?? {});
      } catch (err: any) {
        console.error("Failed to fetch pipeline", err);
        setError(err.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadPipeline();
  }, []);

  if (loading) return <div>Loading pipeline…</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  // finally render Editor
  return <MainPipelineEditor initialPipeline={pipeline} />;
}


