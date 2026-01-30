"use client";

import { useEffect, useState } from "react";
import {X} from "lucide-react";
import {Button} from "@/components/ui/button";

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
  prompt: "",
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
    <section style={{ position: "relative", height: "100%" }}>
      <h2>Pipeline Orchestrator</h2>

      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 8
        }}
      >
        {method.map((m, index) => (
          <div
            key={index}
            style={{
              position: "relative",
              border: "1px solid #ccc",
              padding: 8,
              minWidth: 260
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMethod()}
              className="absolute top-1 right-1 text-muted-foreground hover:text-destructive"
              aria-label="Delete"
            >
              <X className="h-4 w-4" />
            </Button>

            <table
              style={{
                borderCollapse: "collapse",
                width: "100%"
              }}
            >
              <tbody>
                {Object.entries(m).map(
                  ([key, value]) => (
                    <tr key={key}>
                      <td
                        style={{
                          borderBottom:
                            "1px solid #eee",
                          padding: 4,
                          fontWeight: 600
                        }}
                      >
                        {key}
                      </td>
                      <td
                        style={{
                          borderBottom:
                            "1px solid #eee",
                          padding: 4
                        }}
                      >
                        {renderValueEditor(
                          key,
                          value
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          display: "flex",
          gap: 8,
          alignItems: "center"
        }}
      >
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
    </section>
  );
}





