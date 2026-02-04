"use client";

import { useEffect, useState } from "react";
import {X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {FlexibleMethodCard} from "@/components/custom-ui/FlexibleMethodCard";

/* ---------- Domain options ---------- */

const METHOD_TYPES = ["Chunking", "Enriching"] as const;

const ENRICHER_MODELS = ["coder", "thinker", "classifier", "generator", "reasoner"]




/* ---------- Types (simple approach) ---------- */

type MethodSpec = Record<string, any>;



/* ---------- Templates ---------- */

// Evaluate the pipelines in order returning the current pipeline if the score surpasses min_score
{/*
const SEQUENTIAL_TEMPLATE: MethodSpec = {
  type: "Sequential Evaluator",
  min_score: "",
  model: "",
  prompt: "",
  input_level: "",
  output_level: "",
}; */}



// Evaluate all pipelines and choose the most voted one


const CHUNKER_TEMPLATE: MethodSpec = {
  type: "Chunking",
  model: "",
  prompt: "A score in the range 0-100 that evaluates the quality of the chunking process",
  target_level: "", // Name of the chunk to evaluate. Evaluation based on input and output of the chunker. Average score across inputs
  history: false,
}

const ENRICHER_TEMPLATE: MethodSpec = {
  type: "Enriching",
  model: "",
  prompt: "A score in the range 0-100 that evaluates the quality of the chunking process",
  target_level: "", // Name of the chunk to evaluate. Evaluation based on chunk content before and after pipeline. Average score across chunks
  history: false,
}




const RETRIEVER_TEMPLATE: MethodSpec = {
  type: "Retrieving",
  model: "",
  prompt: "",   // evaluation of Retrieval Pipeline based on query and retrieved chunks
}




const TEMPLATE_MAP: Record<(typeof METHOD_TYPES)[number], MethodSpec> = {
  Chunking: CHUNKER_TEMPLATE,
  Enriching: ENRICHER_TEMPLATE,
};

function templateFor(
  type: (typeof METHOD_TYPES)[number]
): MethodSpec {
  return structuredClone(TEMPLATE_MAP[type]);
}

/* ---------- Component ---------- */

export function EvaluatorEditor({
  method,
  onChange
}: {
  method: MethodSpec[]; // pass full array
  onChange: (methods: MethodSpec[]) => void;
}) {
  const [selectedType, setSelectedType] =
    useState<(typeof METHOD_TYPES)[number]>(
      "Chunking"
    );

  /* ---------------- Helpers ---------------- */

  const addMethod = () => {
    const template =
      structuredClone(templateFor(selectedType));

    const next = [
      { ...template, type: selectedType }
    ];

    onChange(next); // enforce single method
  };

  const updateMethod = (key: string, value: any) => {
    if (method.length === 0) return;

    const next = [
      { ...method[0], [key]: value }
    ];

    onChange(next);
  };

  const deleteMethod = () => {
    onChange([]);
  };

  /* ---------------- Field renderer ---------------- */

  function renderValueEditor(
    key: string,
    value: any
  ) {
    if (key === "type") {
      return <span>{String(value)}</span>;
    }

    if (key === "model") {
      return (
        <select
          value={value}
          onChange={(e) =>
            updateMethod(key, e.target.value)
          }
        >
          <option value="">—</option>
          {ENRICHER_MODELS.map((m) => (
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
          updateMethod(key, e.target.value)
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
        <h2 className="text-lg font-semibold">Extraction</h2>

        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) =>
              setSelectedType(
                e.target.value as any
              )
            }
          >
            {METHOD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <button onClick={addMethod}>
            {method.length === 0
              ? "Add method"
              : "Replace method"}
          </button>
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
              {method.map((m, index) => (
                <div style={{ marginTop: 12 }}>
                  <FlexibleMethodCard
                    method={m}
                    onDelete={() => deleteMethod()}
                    renderValue={(key, value) => renderValueEditor(key, value)}
                    onColorChange={(next) => updateMethod("color", next)}
                    defaultOpen={false}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {method.length === 0 && (
            <div className="text-sm text-muted-foreground mt-2">
              No methods yet — add one above.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}






