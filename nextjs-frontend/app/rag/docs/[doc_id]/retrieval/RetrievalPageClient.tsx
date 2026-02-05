// ChunkingPageClient.tsx
"use client";

import { useMemo, useState, useCallback } from "react";


import {SaveRunActions} from "@/components/custom-ui/SaveRunActions";
import {addRetrievalPipeline, runExport} from "@/app/api/rag/docs/[doc_id]/retrieval/retrieval-action";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {FlexibleMethodCard} from "@/components/custom-ui/FlexibleMethodCard";
import {Button} from "@/components/ui/button";
import {BM25_QUERY_PROMPTS, EMBEDDING_QUERY_PROMPTS, REASONER_QUERY_PROMPTS} from "@/components/frontend_data/Prompts";


type MethodSpec = Record<string, any>;
type PipelineSpec = MethodSpec[]








/* ---------- Domain options ---------- */

const METHOD_TYPES = [
  "EmbeddingRetriever",
  "ReasonerRetriever",
  "BM25Retriever",
] as const;

const RETRIEVER_LEVEL_EXTRA = ["rerank"];

const EMBEDDING_MODELS = ["e5-mistral-7b-instruct", "multilingual-e5-large-instruct", "qwen3-embedding-4b"];

const REASONER_MODELS = ["coder", "thinker", "classifier", "generator", "reasoner"];




/* ---------- Templates ---------- */

const BASE_RETRIEVER_FIELDS = {
  level: "",
  retrieval_amount: "",
  query_transformation_model: "",
  query_transformation_prompt: "",
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

const BM25_RETRIEVER_TEMPLATE: MethodSpec = {
  type: "BM25Retriever",
  ...BASE_RETRIEVER_FIELDS,
  k1: "1.5",
  b: "0.75",
};


const TEMPLATE_MAP: Record<(typeof METHOD_TYPES)[number], MethodSpec> = {
  EmbeddingRetriever: EMBEDDING_RETRIEVER_TEMPLATE,
  ReasonerRetriever: REASONER_RETRIEVER_TEMPLATE,
  BM25Retriever: BM25_RETRIEVER_TEMPLATE
};

function templateFor(
  type: (typeof METHOD_TYPES)[number]
): MethodSpec {
  return structuredClone(TEMPLATE_MAP[type]);
}

/* ---------- Component ---------- */

export function RetrievalEditor({
  methods,
  levels,
  onChange
}: {
  methods: PipelineSpec;
  levels: string[];
  onChange: (next: PipelineSpec) => void;
}) {


  const pipeline = methods;

  const [selectedType, setSelectedType] = useState<(typeof METHOD_TYPES)[number]>("EmbeddingRetriever");



  /* ---------------- Helpers ---------------- */

  function updatePipeline(index: number, key: string, value: any) {
    const copy = [...pipeline];
    copy[index] = { ...copy[index], [key]: value };
    onChange(copy);
  }

  function deleteMethod(index: number) {
    onChange(pipeline.filter((_, i) => i !== index));
  }

  function addMethod() {
    const template = structuredClone(templateFor(selectedType));
    onChange([...pipeline, template]);
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
          {REASONER_MODELS.map((m) => (
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

    if (key === "query_transformation_prompt" && method.type === "EmbeddingRetriever") {
      return (
        <>
          <input
            list="embedding-query-prompts"
            type="text"
            value={value}
            onChange={(e) => updatePipeline(index, key, e.target.value)}
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

    if (key === "query_transformation_prompt" && method.type === "BM25Retriever") {
      return (
        <>
          <input
            list="bm25-query-prompts"
            type="text"
            value={value}
            onChange={(e) => updatePipeline(index, key, e.target.value)}
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

    if (key === "query_transformation_prompt" && method.type === "ReasonerRetriever") {
      return (
        <>
          <input
            list="reasoner-query-prompts"
            type="text"
            value={value}
            onChange={(e) => updatePipeline(index, key, e.target.value)}
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
    <section className="h-full flex flex-col gap-3">
      {/* Top toolbar (fixed at top) */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Chunking</h2>

        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {METHOD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <Button type="button" onClick={addMethod} size="sm">
            + Add method
          </Button>
        </div>
      </div>

      {/* Methods container (blue border card) */}
      <Card className="border-2 border-blue-500/60 rounded-xl w-fit max-w-full min-h-0">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Methods
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0 h-full min-h-0">
          {/* Horizontal scroll area for the method cards */}
          <div className="h-full min-h-0 overflow-x-auto overflow-y-hidden pb-2">
            <div className="flex gap-4 min-w-max">
              {methods.map((method, index) => (
                <div style={{ marginTop: 12 }}>
                  <FlexibleMethodCard
                    method={method}
                    onDelete={() => deleteMethod(index)}
                    renderValue={(key, value) => renderValueEditor(method, index, key, value)}
                    onColorChange={(next) => updatePipeline(index, "color", next)}
                    defaultOpen={false}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {methods.length === 0 && (
            <div className="text-sm text-muted-foreground mt-2">
              No methods yet — add one above.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}




/* =========================================================
   ProcessingPageClient (minimal change: keep pipeline in state)
   ========================================================= */

export default function RetrievalPageClient({
  doc_id,
  pipeline: initialPipeline,
  levels: levels,
}: {
  doc_id: string;
  pipeline: MethodSpec[];
  levels: string[];
}) {
  const [pipeline, setPipeline] = useState<PipelineSpec>(initialPipeline);

  const pipelineJson = useMemo(() => JSON.stringify(pipeline), [pipeline]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ---------- Main ---------- */}
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
          <SaveRunActions
            addFunction={addRetrievalPipeline}
            runFunction={runExport}
            doc_id={doc_id}
            pipelineJson={pipelineJson}
            runLabel="Staging"
          />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <RetrievalEditor methods={pipeline} levels={levels} onChange={setPipeline} />
        </div>
      </div>
    </div>
  );
}
