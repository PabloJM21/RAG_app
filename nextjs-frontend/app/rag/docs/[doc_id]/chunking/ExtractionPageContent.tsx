"use client";

import {useEffect, useState} from "react";
import {addExtractionPipeline, fetchExtractionPipeline, runExtraction} from "@/app/api/rag/docs/[doc_id]/extraction/extraction-action";
import {fetchLevels} from "@/app/api/rag/docs/[doc_id]/chunking/chunking-action";

import {EvaluatorEditor} from "@/components/Editors/EvaluatorEditor";
import {ExtractionEditor} from "@/components/Editors/ExtractionEditor";

import { RunButton } from "@/components/custom-ui/RunButton";
import { SaveButton } from "@/components/custom-ui/SaveButton";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";




type MethodSpec = Record<string, any>;
type PipelineSpec = Record<string, MethodSpec[]>;


type RoutingEditorProps = {
  pipelineKey: string;
  methods: MethodSpec[];
  levels: string[];
  onChange: (methods: MethodSpec[]) => void;
};

export function RoutingEditor({
  pipelineKey,
  methods,
  levels,
  onChange
}: RoutingEditorProps) {
  if (pipelineKey === "evaluator") {
    return (
      <EvaluatorEditor
        method={methods} // full array
        onChange={onChange} // enforces max 1 method internally
      />
    );
  }

  // Only render ExtractionEditor if key is a number string
  if (/^\d+$/.test(pipelineKey)) {
    return (
      <ExtractionEditor
        methods={methods}
        levels={levels}
        onChange={onChange}
      />
    );
  }

  // If key is invalid (empty string or deleted), render nothing
  return null;
}





/* ---------- Page ---------- */



// Fetching Pipeline object



export default function ExtractionPageContent({
  doc_id
}: {
  doc_id: string;
}) {
  const [pipelineId, setPipelineId] =
    useState<string>("1");

  const [pipeline, setPipeline] =
    useState<PipelineSpec>({});

  const [levels, setLevels] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const currentPipeline = pipeline[pipelineId] ?? [];
  const evaluatorMethods = pipeline["evaluator"] ?? [];

  /* ---------- Load ---------- */

  useEffect(() => {
    async function loadPipeline() {
      setLoading(true);
      setError(null);

      try {
        const data =
          await fetchExtractionPipeline(doc_id);
        setPipeline(data ?? {});

        const levels_data =
            await fetchLevels(doc_id);
        setLevels(levels_data ?? []);

      } catch (err: any) {
        setError(err.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadPipeline();
  }, [doc_id]);

  /* ---------- Pipeline helpers ---------- */

  function nextPipelineId(pipelines: PipelineSpec): string {
    // Only take keys that are purely digits
    const numericKeys = Object.keys(pipelines).filter((k) => /^\d+$/.test(k));
    const ids = numericKeys.map(Number);
    const max = ids.length ? Math.max(...ids) : 0;
    return String(max + 1);
  }


  function addPipeline() {
    setPipeline((prev) => {
      const id = nextPipelineId(prev);
      setPipelineId(id);
      return { ...prev, [id]: [] };
    });
  }

  function addEvaluator() {
    setPipeline((prev) => {
    if (prev.evaluator) return prev; // already exists
    setPipelineId("evaluator");
    return { ...prev, evaluator: [] };
    });
  }


  function deletePipeline(id: string) {
    setPipeline((prev) => {
      const copy = { ...prev };
      delete copy[id];

      const remaining = Object.keys(copy);
      if (pipelineId === id) {
        setPipelineId(remaining[0] ?? "");
      }

      return copy;
    });
  }

  /* ---------- Forms ---------- */


  /* ---------- Render ---------- */

  if (loading) return <div>Loading pipeline…</div>;
  if (error)
    return <div style={{ color: "red" }}>Error: {error}</div>;

  return (
    <div style={{ display: "flex", height: "100%" }}>

      {/* ---------- Side pane (LEFT) ---------- */}
      <div
        style={{
          width: 160,
          borderRight: "1px solid #ddd",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8
        }}
      >
        {Object.keys(pipeline).map((id) => (
          <div
            key={id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4
            }}
          >
            <button
              onClick={() => setPipelineId(id)}
              style={{
                flex: 1,
                fontWeight:
                  pipelineId === id ? "bold" : "normal",
                background:
                  pipelineId === id ? "#eee" : "transparent"
              }}
            >
              {id}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button>…</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-red-500 cursor-pointer"
                  onClick={() => deletePipeline(id)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        <button onClick={addPipeline}>
          + Add Pipeline
        </button>

        <button onClick={addEvaluator} disabled={!!pipeline.evaluator}>
          + Add Evaluator
        </button>

      </div>

      {/* ---------- Actions column ---------- */}


      <div style={{ flex: 1, position: "relative" }}>
        {/* Floating buttons */}
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
          <form action={addExtractionPipeline} style={{ margin: 0 }}>
            <input
              type="hidden"
              name="doc_id"
              value={doc_id}
            />

            <input
              type="hidden"
              name="pipeline"
              value={JSON.stringify(pipeline)}
            />

            <SaveButton label="Pipeline" />
          </form>

          <form action={runExtraction} style={{ margin: 0 }}>
            <input
              type="hidden"
              name="doc_id"
              value={doc_id}
            />

            <RunButton label="Extraction" />
          </form>
        </div>

        {/* Editor itself */}
        <RoutingEditor
          pipelineKey={pipelineId}
          methods={
            pipelineId === "evaluator"
              ? evaluatorMethods
              : currentPipeline
          }
          levels={levels}
          onChange={(methods) =>
            setPipeline((prev) => ({
              ...prev,
              [pipelineId]: methods,
              evaluator: prev.evaluator ?? [],
            }))
          }
        />
      </div>
    </div>
  );
}