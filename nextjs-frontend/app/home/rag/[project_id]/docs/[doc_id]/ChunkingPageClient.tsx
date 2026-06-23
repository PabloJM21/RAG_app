// ChunkingPageClient.tsx
"use client";

import { useMemo, useState} from "react";
import { addChunkingPipeline, runChunking } from "@/api/rag/docs/[doc_id]/chunking/chunking-action";

import {SaveRunActions} from "@/../components/custom-ui/SaveRunActions";


import { Button } from "@/../components/ui/button";

import { FlexibleMethodCard } from "@/../components/custom-ui/FlexibleMethodCard";
import {
  HierarchicalMethodsContainerCard,
} from "@/../components/custom-ui/Containers";
import { FILTER_PROMPTS } from "@/../components/frontend_data/Prompts";

type MethodSpec = Record<string, any>;
type PipelineSpec = MethodSpec[];
type StageColors = Record<string, string>;

const METHOD_TYPES = [
  "Paragraph Chunker",
  "Sliding Chunker",
] as const;




const PARAGRAPH_TEMPLATE: MethodSpec = {
  type: "Paragraph Chunker",
  level_name: "",
  separator: "##",
  max_words: "",
  with_title: false,
};


const SLIDING_TEMPLATE: MethodSpec = {
  type: "Sliding Window Chunker",
  level_name: "",
  max_words: "",
  overlap_words: "",
  with_title: false,
};



const TEMPLATE_MAP: Record<(typeof METHOD_TYPES)[number], MethodSpec> = {
  "Paragraph Chunker": PARAGRAPH_TEMPLATE,
  "Sliding Chunker": SLIDING_TEMPLATE,
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

          <ChunkingEditor methods={pipeline} onChange={setPipeline} colors={colors} />;
        </div>
      </div>
    </div>
  );
}
