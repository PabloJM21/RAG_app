"use client";

import {
  fetchPipeline,
  addPipeline,
  run,
} from "@/app/api/rag/main-pipeline/pipeline-action";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {FlexibleMethodCard} from "@/components/custom-ui/FlexibleMethodCard";



import { GENERATOR_PROMPTS, EMBEDDING_QUERY_PROMPTS, REASONER_QUERY_PROMPTS,
  BM25_QUERY_PROMPTS, GENERATOR_QUERY_PROMPTS } from "@/components/frontend_data/Prompts";

import { EMBEDDING_MODELS, GENERATOR_MODELS } from "@/components/frontend_data/models";
import {SaveActions} from "@/components/custom-ui/SaveRunActions";


/* ---------- Types ---------- */

type MethodSpec = Record<string, any>;
type PipelineSlot = "router" | "reranker" | "generator";
type PipelineSpec = Partial<Record<PipelineSlot, MethodSpec>>;

type RetrieverType = (typeof RETRIEVER_TYPES)[number];

/* ---------- Domain options ---------- */


const RETRIEVER_TYPES = [
  "EmbeddingRetriever",
  "ReasonerRetriever",
  "BM25Retriever",
] as const;


const RETRIEVER_LEVELS = ["section", "chapter", "document"];




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

  // Only used for router/reranker, generator passes undefined
  selectedType?: RetrieverType;
  setSelectedType: (v: RetrieverType) => void;

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
          onChange={(e) => updateField(slot, key, e.target.value === "true")}
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
        <select value={value} onChange={(e) => updateField(slot, key, e.target.value)}>
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
        <select value={value} onChange={(e) => updateField(slot, key, e.target.value)}>
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
            onChange={(e) => updateField(slot, key, e.target.value)}
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

    if (key === "query_transformation_prompt" && method?.type === "EmbeddingRetriever") {
      return (
        <>
          <input
            list="embedding-query-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) => updateField(slot, key, e.target.value)}
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

    if (key === "query_transformation_prompt" && method?.type === "BM25Retriever") {
      return (
        <>
          <input
            list="bm25-query-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) => updateField(slot, key, e.target.value)}
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

    if (key === "query_transformation_prompt" && method?.type === "ReasonerRetriever") {
      return (
        <>
          <input
            list="reasoner-query-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) => updateField(slot, key, e.target.value)}
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

    if (key === "query_transformation_prompt" && method?.type === "Generator") {
      return (
        <>
          <input
            list="generator-query-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) => updateField(slot, key, e.target.value)}
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
        onChange={(e) => updateField(slot, key, e.target.value)}
      />
    );
  }

  // Typed fallback (only relevant for non-generator slots)
  const typeToUse: RetrieverType = selectedType ?? RETRIEVER_TYPES[0];

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
              value={typeToUse}
              onChange={(e) => setSelectedType(e.target.value as RetrieverType)}
            >
              {RETRIEVER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <button onClick={() => setSlot(slot, createRetriever(typeToUse))}>
              {hasMethod ? `Replace ${slot}` : `Add ${slot}`}
            </button>
          </>
        ) : (
          <button onClick={() => setSlot(slot, structuredClone(GENERATOR_TEMPLATE))}>
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

  // Only slots that actually use retriever selection need this,
  // but it's fine to keep it keyed by PipelineSlot.
  const [selected, setSelected] = useState<
    Partial<Record<PipelineSlot, RetrieverType>>
  >({
    router: RETRIEVER_TYPES[0],
    reranker: RETRIEVER_TYPES[0],
    // generator omitted (doesn't use retriever types)
  });

  function setSlot(slot: PipelineSlot, method: MethodSpec | null) {
    setPipeline((prev) => {
      const copy = {...prev};
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


  return (
    <div style={{display: "flex", flexDirection: "column", height: "100%"}}>
      <h2>Main Pipeline</h2>

      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {/* top-right toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          <SaveActions
            addFunction={addPipeline}
            pipelineJson={JSON.stringify(pipeline)}
            saveLabel="Main Pipeline"
          />
        </div>

        {/* editors area */}
        <div style={{flex: 1, minHeight: 0, overflow: "auto"}}>
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
              selectedType={selected.router}
              setSelectedType={(v: RetrieverType) =>
                setSelected((p) => ({...p, router: v}))
              }
              setSlot={setSlot}
              updateField={updateField}
            />

            <SlotEditor
              slot="reranker"
              label="Reranker"
              method={pipeline.reranker}
              selectedType={selected.reranker}
              setSelectedType={(v: RetrieverType) =>
                setSelected((p) => ({...p, reranker: v}))
              }
              setSlot={setSlot}
              updateField={updateField}
            />

            <SlotEditor
              slot="generator"
              label="Generator"
              method={pipeline.generator}
              selectedType={undefined}
              setSelectedType={(_v: RetrieverType) => {
              }}
              setSlot={setSlot}
              updateField={updateField}
            />
          </div>
        </div>
      </div>
    </div>
  );
}






