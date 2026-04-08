"use client";

import { useMemo, useState } from "react";

import { SaveRunActions } from "@/components/custom-ui/SaveRunActions";
import {
  addRetrievalPipeline,
  runExport,
} from "@/app/api/rag/docs/[doc_id]/retrieval/retrieval-action";

import { FlexibleMethodCard } from "@/components/custom-ui/FlexibleMethodCard";
import { Button } from "@/components/ui/button";
import {
  BM25_QUERY_PROMPTS,
  EMBEDDING_QUERY_PROMPTS,
  REASONER_QUERY_PROMPTS,
} from "@/components/frontend_data/Prompts";
import {
  MethodsContainerCard,
  HierarchicalMethodsContainerCard,
} from "@/components/custom-ui/Containers";

type MethodSpec = Record<string, any>;
type PipelineSpec = MethodSpec[];
type StageColors = Record<string, string>;

/* ---------- Domain options ---------- */

const METHOD_TYPES = [
  "EmbeddingRetriever",
  "ReasonerRetriever",
  "BM25Retriever",
] as const;

const RETRIEVER_LEVEL_EXTRA = ["rerank"];

const EMBEDDING_MODELS = [
  "e5-mistral-7b-instruct",
  "multilingual-e5-large-instruct",
  "qwen3-embedding-4b",
];

const REASONER_MODELS = [
  "coder",
  "thinker",
  "classifier",
  "generator",
  "reasoner",
];

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
  embedding_model: "",
};

const REASONER_RETRIEVER_TEMPLATE: MethodSpec = {
  type: "ReasonerRetriever",
  ...BASE_RETRIEVER_FIELDS,
  reasoner_model: "",
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
  BM25Retriever: BM25_RETRIEVER_TEMPLATE,
};

function templateFor(type: (typeof METHOD_TYPES)[number]): MethodSpec {
  return structuredClone(TEMPLATE_MAP[type]);
}

function getMethodColor(method: MethodSpec, colors: StageColors) {
  const type = String(method?.type ?? "");
  return colors[type] ?? "#ffffff";
}

/* ---------- Component ---------- */

export function RetrievalEditor({
  methods,
  levels,
  colors,
  onChange,
}: {
  methods: PipelineSpec;
  levels: string[];
  colors: StageColors;
  onChange: (next: PipelineSpec) => void;
}) {
  const pipeline = methods;

  const [selectedType, setSelectedType] =
    useState<(typeof METHOD_TYPES)[number]>("EmbeddingRetriever");

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
    if (key === "type") {
      return <span>{String(value)}</span>;
    }

    if (key === "level") {
      return (
        <>
          <input
            list="levels"
            type="text"
            value={String(value ?? "")}
            onChange={(e) => updatePipeline(index, key, e.target.value)}
            style={{ width: "100%" }}
          />

          <datalist id="levels">
            {[...levels, ...RETRIEVER_LEVEL_EXTRA].map((lvl) => (
              <option key={lvl} value={lvl} />
            ))}
          </datalist>
        </>
      );
    }

    if (key === "query_transformation_model") {
      return (
        <select
          value={value}
          onChange={(e) => updatePipeline(index, key, e.target.value)}
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

    if (method.type === "EmbeddingRetriever" && key === "embedding_model") {
      return (
        <select
          value={value}
          onChange={(e) => updatePipeline(index, key, e.target.value)}
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

    if (method.type === "ReasonerRetriever" && key === "reasoner_model") {
      return (
        <select
          value={value}
          onChange={(e) => updatePipeline(index, key, e.target.value)}
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

    if (
      key === "query_transformation_prompt" &&
      method.type === "EmbeddingRetriever"
    ) {
      return (
        <>
          <input
            list="embedding-query-prompts"
            type="text"
            value={String(value ?? "")}
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
            value={String(value ?? "")}
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

    if (
      key === "query_transformation_prompt" &&
      method.type === "ReasonerRetriever"
    ) {
      return (
        <>
          <input
            list="reasoner-query-prompts"
            type="text"
            value={String(value ?? "")}
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

    return (
      <input
        type="text"
        value={String(value ?? "")}
        onChange={(e) => updatePipeline(index, key, e.target.value)}
        style={{ width: "100%" }}
      />
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <section className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Retrieval</h2>

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

      <HierarchicalMethodsContainerCard
        title="Hierarchical Pipeline"
        methods={methods}
        renderMethod={(method, index) => (
          <FlexibleMethodCard
            method={method}
            color={getMethodColor(method, colors)}
            onDelete={() => deleteMethod(index)}
            renderValue={(key, value) =>
              renderValueEditor(method, index, key, value)
            }
            highlightKeys={["level"]}
            defaultOpen={false}
          />
        )}
      />
    </section>
  );
}

/* =========================================================
   RetrievalPageClient
   ========================================================= */

export default function RetrievalPageClient({
  doc_id,
  pipeline: initialPipeline,
  levels,
  colors,
}: {
  doc_id: string;
  pipeline: MethodSpec[];
  levels: string[];
  colors: StageColors;
}) {
  const [pipeline, setPipeline] = useState<PipelineSpec>(initialPipeline);

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
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          <SaveRunActions
            addFunction={addRetrievalPipeline}
            runFunction={runExport}
            doc_id={doc_id}
            pipelineJson={pipelineJson}
            runLabel="Staging"
          />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <RetrievalEditor
            methods={pipeline}
            levels={levels}
            colors={colors}
            onChange={setPipeline}
          />
        </div>
      </div>
    </div>
  );
}