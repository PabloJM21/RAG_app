"use client";

import {
  fetchPipeline,
  addPipeline,
  run,
} from "@/app/api/rag/main-pipeline/pipeline-action";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {FlexibleMethodCard} from "@/components/custom-ui/FlexibleMethodCard";

/* ---------- Types ---------- */

type MethodSpec = Record<string, any>;
type PipelineSlot = "router" | "reranker" | "generator";
type PipelineSpec = Partial<Record<PipelineSlot, MethodSpec>>;

/* ---------- Domain options ---------- */

const RETRIEVER_TYPES = [
  "EmbeddingRetriever",
  "ReasonerRetriever",
  "BM25Retriever",
] as const;


const RETRIEVER_LEVELS = ["section", "chapter", "document"];

const EMBEDDING_MODELS = ["e5-mistral-7b-instruct", "multilingual-e5-large-instruct", "qwen3-embedding-4b"];

//query_transformation_model, reasoner_model, generator_model
const GENERATOR_MODELS = ["coder", "thinker", "classifier", "generator", "reasoner"];

//generator_prompt
const GENERATOR_PROMPTS = [
  "A complete answer to this QUERY based only on the provided CHUNKS",
];

const EMBEDDING_QUERY_PROMPTS = [
  "A new string matching this QUERY suited for retrieving text chunks based on embeddings and cosine similarity",
];

const REASONER_QUERY_PROMPTS = [
  "A new string matching this QUERY suited for retrieving text chunks based on direct LLM calls",
];

const BM25_QUERY_PROMPTS = [
  "A new string matching this QUERY suited for retrieving text chunks based on the BM25 method",
];

const GENERATOR_QUERY_PROMPTS = [
  "A new string matching this QUERY that can be directly combined with some text chunks to provide a RAG answer",
];






/* ---------- Templates ---------- */

const DEFAULT_METHOD_COLOR = "#ffffff";



const BASE_RETRIEVER_FIELDS = {
  level: "",
  retrieval_amount: "",
  query_transformation_model: "",
  query_transformation_prompt: "",
};

const EMBEDDING_RETRIEVER_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "EmbeddingRetriever",
  ...BASE_RETRIEVER_FIELDS,
  embedding_model: ""
};

const REASONER_RETRIEVER_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "ReasonerRetriever",
  ...BASE_RETRIEVER_FIELDS,
  reasoner_model: ""
};

const BM25_RETRIEVER_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "BM25Retriever",
  ...BASE_RETRIEVER_FIELDS,
  k1: "1.5",
  b: "0.75",
};


const GENERATOR_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "Generator",
  query_transformation_model: "",
  query_transformation_prompt: "",
  generator_model: "",
  generator_prompt: ""
};

/* ---------- Helpers ---------- */

const RETRIEVER_TEMPLATE_MAP: Record<
  (typeof RETRIEVER_TYPES)[number],
  MethodSpec
> = {
  EmbeddingRetriever: EMBEDDING_RETRIEVER_TEMPLATE,
  ReasonerRetriever: REASONER_RETRIEVER_TEMPLATE,
  BM25Retriever: BM25_RETRIEVER_TEMPLATE,
};

function createRetriever(
  type: (typeof RETRIEVER_TYPES)[number]
): MethodSpec {
  return structuredClone(RETRIEVER_TEMPLATE_MAP[type]);
}




function isCompletePipeline(
  pipeline: PipelineSpec
): pipeline is Record<PipelineSlot, MethodSpec> {
  return (
    typeof pipeline.router?.type === "string" &&
    typeof pipeline.reranker?.type === "string" &&
    typeof pipeline.generator?.type === "string"
  );
}

/* ---------- Slot Editor ---------- */

function SlotEditor({
  slot,
  label,
  method,
  selectedType,
  setSelectedType,
  setSlot,
  updateField,
}: {
  slot: PipelineSlot;
  label: string;
  method: MethodSpec | undefined;
  selectedType: string;
  setSelectedType: (v: string) => void;
  setSlot: (slot: PipelineSlot, method: MethodSpec | null) => void;
  updateField: (slot: PipelineSlot, key: string, value: any) => void;
}) {
  const hasMethod =
    !!method &&
    typeof method.type === "string" &&
    method.type.length > 0;

  function renderField(key: string, value: any) {
    if (key === "type") return <b>{value}</b>;

    if (typeof value === "boolean") {
      return (
        <select
          value={String(value)}
          onChange={(e) =>
            updateField(slot, key, e.target.value === "true")
          }
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (
      key === "reasoner_model" ||
      key === "generator_model" ||
      key === "query_transformation_model"
    ) {
      return (
        <select
          value={value}
          onChange={(e) =>
            updateField(slot, key, e.target.value)
          }
        >
          <option value="">—</option>
          {GENERATOR_MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      );
    }

    if (key === "embedding_model") {
      return (
        <select
          value={value}
          onChange={(e) =>
            updateField(slot, key, e.target.value)
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

    if (key === "generator_prompt") {
      return (
        <>
          <input
            list="generator-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) =>
              updateField(slot, key, e.target.value)
            }
            style={{ width: "100%" }}
          />
          <datalist id="generator-prompts">
            {GENERATOR_PROMPTS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </>
      );
    }

    if (
      key === "query_transformation_prompt" &&
      method?.type === "EmbeddingRetriever"
    ) {
      return (
        <>
          <input
            list="embedding-query-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) =>
              updateField(slot, key, e.target.value)
            }
            style={{ width: "100%" }}
          />
          <datalist id="embedding-query-prompts">
            {EMBEDDING_QUERY_PROMPTS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </>
      );
    }

    if (
      key === "query_transformation_prompt" &&
      method?.type === "BM25Retriever"
    ) {
      return (
        <>
          <input
            list="bm25-query-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) =>
              updateField(slot, key, e.target.value)
            }
            style={{ width: "100%" }}
          />
          <datalist id="bm25-query-prompts">
            {BM25_QUERY_PROMPTS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </>
      );
    }

    if (
      key === "query_transformation_prompt" &&
      method?.type === "ReasonerRetriever"
    ) {
      return (
        <>
          <input
            list="reasoner-query-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) =>
              updateField(slot, key, e.target.value)
            }
            style={{ width: "100%" }}
          />
          <datalist id="reasoner-query-prompts">
            {REASONER_QUERY_PROMPTS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </>
      );
    }

    if (
      key === "query_transformation_prompt" &&
      method?.type === "Generator"
    ) {
      return (
        <>
          <input
            list="generator-query-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) =>
              updateField(slot, key, e.target.value)
            }
            style={{ width: "100%" }}
          />
          <datalist id="generator-query-prompts">
            {GENERATOR_QUERY_PROMPTS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </>
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

  return (
    <div style={{ border: "1px solid #eee", padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>{label}</h3>

      {/* Selector / Add */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        {slot !== "generator" ? (
          <>
            <select
              value={selectedType}
              onChange={(e) =>
                setSelectedType(e.target.value)
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
                    selectedType || RETRIEVER_TYPES[0]
                  )
                )
              }
            >
              {hasMethod ? `Replace ${slot}` : `Add ${slot}`}
            </button>
          </>
        ) : (
          <button
            onClick={() =>
              setSlot(slot, structuredClone(GENERATOR_TEMPLATE))
            }
          >
            {hasMethod ? `Replace ${slot}` : `Add ${slot}`}
          </button>
        )}
      </div>

      {/* Method box (collapsible) */}
      {hasMethod && method && (
        <div style={{ marginTop: 12 }}>
          <FlexibleMethodCard
            method={method}
            onDelete={() => setSlot(slot, null)}
            renderValue={(key, value) => renderField(key, value)}
            onColorChange={(next) => updateField(slot, "color", next)}
            defaultOpen={false}
          />
        </div>
      )}
    </div>
  );
}


/* ---------- MainPipelineEditor (now composes 3 editors) ---------- */

export function MainPipelineEditor({
  initialPipeline,
}: {
  initialPipeline: PipelineSpec;
}) {
  const [pipeline, setPipeline] = useState<PipelineSpec>(initialPipeline);

  const [selected, setSelected] = useState<
    Partial<Record<PipelineSlot, string>>
  >({
    router: "",
    reranker: "",
  });

  function setSlot(slot: PipelineSlot, method: MethodSpec | null) {
    setPipeline((prev) => {
      const copy = { ...prev };
      if (method === null) delete copy[slot];
      else copy[slot] = method;
      return copy;
    });
  }

  function updateField(slot: PipelineSlot, key: string, value: any) {
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

  const canSave = useMemo(() => isCompletePipeline(pipeline), [pipeline]);

  return (
    <section className="w-full">
      <h2>Main Pipeline</h2>

      {/* 3 editors horizontally */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          width: "100%",
        }}
      >
        <SlotEditor
          slot="router"
          label="Router"
          method={pipeline.router}
          selectedType={selected.router ?? ""}
          setSelectedType={(v) => setSelected((p) => ({ ...p, router: v }))}
          setSlot={setSlot}
          updateField={updateField}
        />

        <SlotEditor
          slot="reranker"
          label="Reranker"
          method={pipeline.reranker}
          selectedType={selected.reranker ?? ""}
          setSelectedType={(v) => setSelected((p) => ({ ...p, reranker: v }))}
          setSlot={setSlot}
          updateField={updateField}
        />

        <SlotEditor
          slot="generator"
          label="Generator"
          method={pipeline.generator}
          selectedType="" // not used
          setSelectedType={() => {}}
          setSlot={setSlot}
          updateField={updateField}
        />
      </div>

      {/* Save */}
      <div style={{ marginTop: 12 }}>
        {canSave && (
          <form action={addPipeline}>
            <input
              type="hidden"
              name="pipeline"
              value={JSON.stringify(pipeline)}
            />
            <button type="submit">Save</button>
          </form>
        )}
      </div>

      {/* Run buttons */}
      <div className="mt-6 w-full">
        <div className="grid grid-cols-4 gap-3 w-full">
          <Button
            variant="outline"
            className="w-full text-lg py-4"
            onClick={() => run("conversion")}
          >
            Run Conversion
          </Button>

          <Button
            variant="outline"
            className="w-full text-lg py-4"
            onClick={() => run("chunking")}
          >
            Run Chunking
          </Button>

          <Button
            variant="outline"
            className="w-full text-lg py-4"
            onClick={() => run("retrieval")}
          >
            Run Export
          </Button>
        </div>
      </div>
    </section>
  );
}





