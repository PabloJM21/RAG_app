"use client";

import * as React from "react";
import { useMemo, useState } from "react";

import {
  addRetrievers, run,
} from "@/app/api/rag/main-pipeline/pipeline-action";

import { SaveActions, ThreeRunActions } from "@/components/custom-ui/SaveRunActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlexibleMethodCard } from "@/components/custom-ui/FlexibleMethodCard";

type MethodSpec = Record<string, any>;
type PipelineSpec = MethodSpec[];
type RetrieverType = (typeof RETRIEVER_TYPES)[number];

/* ---------- Domain options ---------- */

const RETRIEVER_TYPES = [
  "EmbeddingRetriever",
  "ReasonerRetriever",
  "BM25Retriever",
] as const;

/* ---------- Templates ---------- */

const DEFAULT_METHOD_COLOR = "#ffffff";

const BASE_RETRIEVER_FIELDS = {
  retrieval_amount: "",
  query_transformation_model: "",
  query_transformation_prompt: "",
};

const EMBEDDING_RETRIEVER_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "EmbeddingRetriever",
  ...BASE_RETRIEVER_FIELDS,
  embedding_model: "",
};

const REASONER_RETRIEVER_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "ReasonerRetriever",
  ...BASE_RETRIEVER_FIELDS,
  reasoner_model: "",
};

const BM25_RETRIEVER_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "BM25Retriever",
  ...BASE_RETRIEVER_FIELDS,
  k1: "1.5",
  b: "0.75",
};

const RETRIEVER_TEMPLATE_MAP: Record<RetrieverType, MethodSpec> = {
  EmbeddingRetriever: EMBEDDING_RETRIEVER_TEMPLATE,
  ReasonerRetriever: REASONER_RETRIEVER_TEMPLATE,
  BM25Retriever: BM25_RETRIEVER_TEMPLATE,
};

function createRetriever(type: RetrieverType): MethodSpec {
  return structuredClone(RETRIEVER_TEMPLATE_MAP[type]);
}

/* ---------- External data ---------- */

import {
  EMBEDDING_QUERY_PROMPTS,
  REASONER_QUERY_PROMPTS,
  BM25_QUERY_PROMPTS,
} from "@/components/frontend_data/Prompts";
import { EMBEDDING_MODELS, GENERATOR_MODELS } from "@/components/frontend_data/models";

/* ---------- Helpers ---------- */

function slotDescription(slot: "router" | "reranker") {
  switch (slot) {
    case "router":
      return "Select and prepare retrieval.";
    case "reranker":
      return "Refine retrieved results.";
  }
}

function prettyLabel(slot: "router" | "reranker") {
  switch (slot) {
    case "router":
      return "Router";
    case "reranker":
      return "Reranker";
  }
}

function renderRetrieverField({
  slot,
  method,
  updateField,
  key,
  value,
}: {
  slot: "router" | "reranker";
  method: MethodSpec;
  updateField: (key: string, value: any) => void;
  key: string;
  value: any;
}) {
  if (key === "type") {
    return <span>{String(value)}</span>;
  }

  if (typeof value === "boolean") {
    return (
      <select
        value={String(value)}
        onChange={(e) => updateField(key, e.target.value === "true")}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (key === "reasoner_model" || key === "query_transformation_model") {
    return (
      <select value={value ?? ""} onChange={(e) => updateField(key, e.target.value)}>
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
      <select value={value ?? ""} onChange={(e) => updateField(key, e.target.value)}>
        <option value="">—</option>
        {EMBEDDING_MODELS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    );
  }

  if (key === "query_transformation_prompt" && method.type === "EmbeddingRetriever") {
    return (
      <>
        <input
          list={`${slot}-embedding-query-prompts`}
          type="text"
          value={String(value ?? "")}
          onChange={(e) => updateField(key, e.target.value)}
          style={{ width: "100%" }}
        />
        <datalist id={`${slot}-embedding-query-prompts`}>
          {EMBEDDING_QUERY_PROMPTS.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>
      </>
    );
  }

  if (key === "query_transformation_prompt" && method.type === "BM25Retriever") {
    return (
      <>
        <input
          list={`${slot}-bm25-query-prompts`}
          type="text"
          value={String(value ?? "")}
          onChange={(e) => updateField(key, e.target.value)}
          style={{ width: "100%" }}
        />
        <datalist id={`${slot}-bm25-query-prompts`}>
          {BM25_QUERY_PROMPTS.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>
      </>
    );
  }

  if (key === "query_transformation_prompt" && method.type === "ReasonerRetriever") {
    return (
      <>
        <input
          list={`${slot}-reasoner-query-prompts`}
          type="text"
          value={String(value ?? "")}
          onChange={(e) => updateField(key, e.target.value)}
          style={{ width: "100%" }}
        />
        <datalist id={`${slot}-reasoner-query-prompts`}>
          {REASONER_QUERY_PROMPTS.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>
      </>
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => updateField(key, e.target.value)}
      style={{ width: "100%" }}
    />
  );
}

/* ---------- Retriever card ---------- */

function RetrieverSlotCard({
  slot,
  method,
  selectedType,
  setSelectedType,
  onChange,
}: {
  slot: "router" | "reranker";
  method: MethodSpec | undefined;
  selectedType: RetrieverType;
  setSelectedType: (v: RetrieverType) => void;
  onChange: (next: MethodSpec | null) => void;
}) {
  const hasMethod =
    !!method &&
    typeof method.type === "string" &&
    method.type.length > 0;

  return (
    <Card className="rounded-xl border bg-card text-card-foreground shadow">
      <CardHeader className="py-4 bg-muted/30 border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {prettyLabel(slot)}
            </CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              {slotDescription(slot)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as RetrieverType)}
            >
              {RETRIEVER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <Button
              type="button"
              size="sm"
              onClick={() => onChange(createRetriever(selectedType))}
            >
              {hasMethod ? `Replace ${slot}` : `Add ${slot}`}
            </Button>

            {hasMethod && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange(null)}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {hasMethod && method ? (
          <FlexibleMethodCard
            method={method}
            onDelete={() => onChange(null)}
            renderValue={(key, value) =>
              renderRetrieverField({
                slot,
                method,
                key,
                value,
                updateField: (fieldKey, fieldValue) =>
                  onChange({ ...method, [fieldKey]: fieldValue }),
              })
            }
            defaultOpen={false}
          />
        ) : (
          <div className="text-sm text-muted-foreground">
            No {slot} yet — add one above.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Editor ---------- */

export function RetrieversEditor({
  methods,
  onChange,
}: {
  methods: PipelineSpec;
  onChange: (next: PipelineSpec) => void;
}) {
  const router = methods[0];
  const reranker = methods[1];

  const [selectedType, setSelectedType] = useState<{
    router: RetrieverType;
    reranker: RetrieverType;
  }>({
    router: "EmbeddingRetriever",
    reranker: "EmbeddingRetriever",
  });

  function setMethodAt(index: number, next: MethodSpec | null) {
    const copy = [...methods];

    if (next === null) {
      copy[index] = {};
    } else {
      copy[index] = next;
    }

    onChange(copy);
  }

  return (
    <section className="h-full flex flex-col gap-3">
      <div className="flex flex-col gap-4">
        <RetrieverSlotCard
          slot="router"
          method={router}
          selectedType={selectedType.router}
          setSelectedType={(v) =>
            setSelectedType((prev) => ({ ...prev, router: v }))
          }
          onChange={(next) => setMethodAt(0, next)}
        />

        <RetrieverSlotCard
          slot="reranker"
          method={reranker}
          selectedType={selectedType.reranker}
          setSelectedType={(v) =>
            setSelectedType((prev) => ({ ...prev, reranker: v }))
          }
          onChange={(next) => setMethodAt(1, next)}
        />
      </div>
    </section>
  );
}

/* ---------- Page client ---------- */

export default function RetrieversPageClient({
  pipeline: initialRetrievers,
}: {
  pipeline: MethodSpec[];
}) {

  const [pipeline, setPipeline] = useState<PipelineSpec>(initialRetrievers);

  const pipelineJson = useMemo(() => JSON.stringify(pipeline), [pipeline]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <div className="flex items-center gap-2">
            <ThreeRunActions
              runConversion={() => run("conversion")}
              runChunking={() => run("chunking")}
              runRetrieval={() => run("retrieval")}
            />

            <SaveActions
              addFunction={addRetrievers}
              pipelineJson={pipelineJson}
              saveLabel="Main Retrievers"
            />
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <RetrieversEditor methods={pipeline} onChange={setPipeline} />
        </div>
      </div>
    </div>
  );
}