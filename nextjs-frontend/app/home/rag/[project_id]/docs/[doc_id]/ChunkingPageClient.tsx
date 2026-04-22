// ChunkingPageClient.tsx
"use client";

import { useMemo, useState} from "react";
import { addChunkingPipeline, runChunking } from "@/app/api/rag/docs/[doc_id]/chunking/chunking-action";

import {SaveRunActions} from "@/components/custom-ui/SaveRunActions";


import { Button } from "@/components/ui/button";

import { FlexibleMethodCard } from "@/components/custom-ui/FlexibleMethodCard";
import {
  HierarchicalMethodsContainerCard,
} from "@/components/custom-ui/Containers";
import { FILTER_PROMPTS } from "@/components/frontend_data/Prompts";

type MethodSpec = Record<string, any>;
type PipelineSpec = MethodSpec[];
type StageColors = Record<string, string>;

const METHOD_TYPES = [
  "Paragraph Chunker",
  "Hybrid Chunker",
  "Sliding Chunker",
  "Enricher",
  "Filter",
] as const;

const ENRICHER_POSITION = ["top", "bottom", "replace"];
const ENRICHER_MODELS = ["coder", "thinker", "classifier", "generator", "reasoner"];
const ENRICHER_PROMPTS = [
  "A fluent and complete version of this chunk in the same language.",
];

const EMBEDDING_MODELS = [
  "intfloat/e5-mistral-7b-instruct",
  "intfloat/multilingual-e5-large-instruct",
  "Qwen/Qwen3-Embedding-4B",
];

const PARAGRAPH_TEMPLATE: MethodSpec = {
  type: "Paragraph Chunker",
  level_name: "",
  separator: "##",
  tokenizer_model: "",
  max_tokens: "",
  with_title: false,
};

const HYBRID_TEMPLATE: MethodSpec = {
  type: "Hybrid Chunker",
  level_name: "",
  tokenizer_model: "",
  max_tokens: "",
  with_title: false,
};

const SLIDING_TEMPLATE: MethodSpec = {
  type: "Sliding Window Chunker",
  level_name: "",
  tokenizer_model: "",
  max_tokens: "",
  overlap_tokens: "",
  with_title: false,
};

const ENRICHER_TEMPLATE: MethodSpec = {
  type: "Enricher",
  model: "",
  prompt: "",
  position: "",
  caption: "",
};

const FILTER_TEMPLATE: MethodSpec = {
  type: "Filter",
  model: "",
  prompt: "",
};

const TEMPLATE_MAP: Record<(typeof METHOD_TYPES)[number], MethodSpec> = {
  "Paragraph Chunker": PARAGRAPH_TEMPLATE,
  "Hybrid Chunker": HYBRID_TEMPLATE,
  "Sliding Chunker": SLIDING_TEMPLATE,
  Enricher: ENRICHER_TEMPLATE,
  Filter: FILTER_TEMPLATE,
};

function templateFor(type: (typeof METHOD_TYPES)[number]): MethodSpec {
  return structuredClone(TEMPLATE_MAP[type]);
}

function getMethodColor(method: MethodSpec, colors: StageColors) {
  const type = String(method?.type ?? "");
  return colors[type] ?? "#ffffff";
}

export function ChunkingEditor({
  methods,
  onChange,
  colors,
}: {
  methods: PipelineSpec;
  onChange: (next: PipelineSpec) => void
  colors: StageColors;
}) {

  const pipeline = methods;


  const [selectedType, setSelectedType] =
    useState<(typeof METHOD_TYPES)[number]>("Paragraph Chunker");

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

  function renderValueEditor(
    method: Partial<MethodSpec>,
    index: number,
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
            updatePipeline(index, key, e.target.value === "true")
          }
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (method.type === "Enricher" && key === "prompt") {
      return (
        <>
          <input
            list="enricher-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) => updatePipeline(index, key, e.target.value)}
            style={{ width: "100%" }}
          />
          <datalist id="enricher-prompts">
            {ENRICHER_PROMPTS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </>
      );
    }

    if (method.type === "Enricher" && key === "position") {
      return (
        <select
          value={value}
          onChange={(e) => updatePipeline(index, key, e.target.value)}
        >
          <option value="">—</option>
          {ENRICHER_POSITION.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      );
    }

    if (method.type === "Filter" && key === "prompt") {
      return (
        <>
          <input
            list="filter-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) => updatePipeline(index, key, e.target.value)}
            style={{ width: "100%" }}
          />
          <datalist id="filter-prompts">
            {FILTER_PROMPTS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </>
      );
    }

    if (key === "model") {
      return (
        <select
          value={value}
          onChange={(e) => updatePipeline(index, key, e.target.value)}
        >
          <option value="">—</option>
          {ENRICHER_MODELS.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      );
    }

    if (key === "tokenizer_model") {
      return (
        <select
          value={value}
          onChange={(e) => updatePipeline(index, key, e.target.value)}
        >
          <option value="">—</option>
          {EMBEDDING_MODELS.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        value={String(value)}
        onChange={(e) => updatePipeline(index, key, e.target.value)}
        style={{ width: "100%" }}
      />
    );
  }

  return (
    <section className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
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
            highlightKeys={["level_name"]}
            defaultOpen={false}
          />
        )}
      />
    </section>
  );
}






export default function ChunkingPageClient({
  project_id,
  doc_id,
  initialPipeline,
  colors,
}: {
  project_id: string;
  doc_id: string;
  initialPipeline: PipelineSpec;
  colors: StageColors;
}) {
  const [pipeline, setPipeline] = useState<PipelineSpec>(initialPipeline);

  const pipelineJson = useMemo(() => JSON.stringify(pipeline), [pipeline]);


  return (
    <div style={{display: "flex", flexDirection: "column", height: "100%"}}>
      {/* ---------- Main ---------- */}
      <div style={{flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <SaveRunActions
            project_id={project_id}
            addFunction={addChunkingPipeline}
            runFunction={runChunking}
            doc_id={doc_id}
            pipelineJson={pipelineJson}
            runLabel="Chunking"
          />
        </div>


        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>

          <ChunkingEditor methods={currentMethods} onChange={setPipeline} colors={colors} />;
        </div>
      </div>
    </div>
  );
}
