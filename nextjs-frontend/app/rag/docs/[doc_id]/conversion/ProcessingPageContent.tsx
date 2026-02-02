"use client";

import {useEffect, useState} from "react";

import { RunButton } from "@/components/custom-ui/RunButton";
import { SaveButton } from "@/components/custom-ui/SaveButton";
import { Button } from "@/components/ui/button"
import { X } from "lucide-react";

import {
  addProcessingPipeline,
  fetchProcessingPipeline, runProcessing
} from "@/app/api/rag/docs/[doc_id]/conversion_processing/processing-action";



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
  doc_id,
  methods,
}: {
  doc_id: string;
  methods: PipelineSpec;
}) {
  const [pipeline, setPipeline] =
    useState<PipelineSpec>(methods);

  const [selectedType, setSelectedType] =
    useState<(typeof METHOD_TYPES)[number]>(
      "Rewriter"
    );

  /* ---------------- Helpers ---------------- */

  function updatePipeline(
    index: number,
    key: string,
    value: any
  ) {
    const copy = [...pipeline];
    copy[index] = { ...copy[index], [key]: value };
    setPipeline(copy);
  }

  function deleteMethod(index: number) {
    setPipeline(
      pipeline.filter((_, i) => i !== index)
    );
  }

  function addMethod() {
    const template = structuredClone(
      templateFor(selectedType)
    );
    setPipeline([...pipeline, template]);
  }

  function isCompleteMethod(
    methods: PipelineSpec
  ): methods is MethodSpec[] {
    return methods.every(
      (method) => typeof method?.type === "string"
    );
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
          onChange={(e) =>
            updatePipeline(
              index,
              key,
              e.target.value === "true"
            )
          }
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
            onChange={(e) =>
              updatePipeline(index, key, e.target.value)
            }
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
            onChange={(e) =>
              updatePipeline(index, key, e.target.value)
            }
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
          onChange={(e) =>
            updatePipeline(index, key, e.target.value)
          }
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

    // caption + fallback → free text
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
    <section
      style={{
        position: "relative",
        height: "100%",
      }}
    >
      <h2>Extraction</h2>

      {/* ---------- Floating actions (top-right) ---------- */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          zIndex: 10,
        }}
      >
        {isCompleteMethod(pipeline) && (
          <form action={addProcessingPipeline} style={{ margin: 0 }}>
            <input type="hidden" name="doc_id" value={doc_id} />
            <input
              type="hidden"
              name="pipeline"
              value={JSON.stringify(pipeline)}
            />
            <SaveButton label="Processing Pipeline" />
          </form>
        )}

        {isCompleteMethod(pipeline) && (
          <form action={runProcessing} style={{ margin: 0 }}>
            <input type="hidden" name="doc_id" value={doc_id} />
            <RunButton label="Markdown Processing" />
          </form>
        )}

      </div>

      {/* ---------- Methods row (scrollable) ---------- */}
      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 8, // space for bottom bar
        }}
      >
        {pipeline.map((method, index) => (
          <div
            key={index}
            style={{
              position: "relative",
              border: "1px solid #ccc",
              padding: 8,
              minWidth: 260,
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMethod(index)}
              className="absolute top-1 right-1 text-muted-foreground hover:text-destructive"
              aria-label="Delete"
            >
              <X className="h-4 w-4" />
            </Button>

            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
              }}
            >
              <tbody>
                {Object.entries(method).map(([key, value]) => (
                  <tr key={key}>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: 4,
                        fontWeight: 600,
                      }}
                    >
                      {key}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: 4,
                      }}
                    >
                      {renderValueEditor(
                        method,
                        index,
                        key,
                        value
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* ---------- Add method bar (bottom-left) ---------- */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <select
          value={selectedType}
          onChange={(e) =>
            setSelectedType(e.target.value as any)
          }
        >
          {METHOD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button onClick={addMethod}>
          + Add method
        </button>
      </div>
    </section>
  );
}









export default function ProcessingPageContent({
  doc_id,
}: {
  doc_id: string;
}) {
  const [pipeline, setPipeline] =
    useState<PipelineSpec>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadPipeline() {
      try {
        const pipeline_data =
          await fetchProcessingPipeline(doc_id);
        setPipeline(pipeline_data ?? []);
      } catch (err: any) {
        setError(err.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadPipeline();
  }, [doc_id]);

  if (loading) {
    return <div>Loading pipeline…</div>;
  }

  if (error) {
    return (
      <div style={{ color: "red" }}>
        Error: {error}
      </div>
    );
  }

  return (
    <ProcessingEditor doc_id={doc_id} methods={pipeline} />
  );
}
