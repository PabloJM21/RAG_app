"use client";

import {useEffect, useMemo, useState} from "react";


import { Button } from "@/components/ui/button"
import { X } from "lucide-react";

import {
  addProcessingPipeline,
  fetchProcessingPipeline, runProcessing
} from "@/app/api/rag/docs/[doc_id]/conversion_processing/processing-action";
import {SaveRunActions} from "@/components/custom-ui/SaveRunActions";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {FlexibleMethodCard} from "@/components/custom-ui/FlexibleMethodCard";



type MethodSpec = Record<string, any>;
type PipelineSpec = MethodSpec[]

/* ---------- Domain options ---------- */

const METHOD_TYPES = ["Rewriter", "Filter"] as const;


const ENRICHER_MODELS = ["coder", "thinker", "classifier", "generator", "reasoner"]
const REWRITER_PROMPTS = ["A fluent transcription of this table."]
const FILTER_PROMPTS = ["A boolean that is False if the content of the chunk is not scientific, and True otherwise"]

/* ---------- Templates ---------- */

// For rewriting tables and image content


const REWRITER_TEMPLATE: MethodSpec = {
  type: "Rewriter",
  starting_mark: "|",
  ending_mark: "",
  model: "",
  prompt: "",
  history: false,
};



const FILTER_TEMPLATE: MethodSpec = {
  type: "Filter",
  starting_mark: "|",
  ending_mark: "",
  remove_mark: true,
  model: "",
  prompt: "",
  history: false,
};






const TEMPLATE_MAP: Record<(typeof METHOD_TYPES)[number], MethodSpec> = {
  Rewriter: REWRITER_TEMPLATE,
  Filter: FILTER_TEMPLATE,
};

function templateFor(
  type: (typeof METHOD_TYPES)[number]
): MethodSpec {
  return structuredClone(TEMPLATE_MAP[type]);
}

export function ProcessingEditor({
  methods,
  onChange,
}: {
  methods: PipelineSpec;
  onChange: (next: PipelineSpec) => void;
}) {
  const pipeline = methods;

  const [selectedType, setSelectedType] = useState<(typeof METHOD_TYPES)[number]>("Rewriter");

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

    if (typeof value === "boolean") {
      return (
        <select
          value={String(value)}
          onChange={(e) => updatePipeline(index, key, e.target.value === "true")}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (method.type === "Rewriter" && key === "prompt") {
      return (
        <>
          <input
            list="rewriter-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) => updatePipeline(index, key, e.target.value)}
            style={{ width: "100%" }}
          />
          <datalist id="rewriter-prompts">
            {REWRITER_PROMPTS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </>
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
        <select value={value} onChange={(e) => updatePipeline(index, key, e.target.value)}>
          <option value="">—</option>
          {ENRICHER_MODELS.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      );
    }

    // caption + fallback → free text
    return (
      <input
        type="text"
        value={String(value)}
        onChange={(e) => updatePipeline(index, key, e.target.value)}
        style={{ width: "100%" }}
      />
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <section className="h-full flex flex-col gap-3">
      {/* Top toolbar (fixed at top) */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Processing</h2>

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
          <CardTitle className="text-sm font-medium text-muted-foreground">Methods</CardTitle>
        </CardHeader>

        <CardContent className="pt-0 h-full min-h-0">
          {/* Horizontal scroll area for the method cards */}
          <div className="h-full min-h-0 overflow-x-auto overflow-y-hidden pb-2">
            <div className="flex gap-4 min-w-max">
              {pipeline.map((method, index) => (
                <div key={index} style={{ marginTop: 12 }}>
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
          {pipeline.length === 0 && (
            <div className="text-sm text-muted-foreground mt-2">No methods yet — add one above.</div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/* =========================================================
   ProcessingPageClient (minimal change: keep pipeline in state)
   ========================================================= */

export default function ProcessingPageClient({
  doc_id,
  pipeline: initialPipeline,
}: {
  doc_id: string;
  pipeline: MethodSpec[];
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
            addFunction={addProcessingPipeline}
            runFunction={runProcessing}
            doc_id={doc_id}
            pipelineJson={pipelineJson}
            runLabel="Processing"
          />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <ProcessingEditor methods={pipeline} onChange={setPipeline} />
        </div>
      </div>
    </div>
  );
}