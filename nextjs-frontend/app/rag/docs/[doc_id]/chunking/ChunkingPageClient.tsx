// ChunkingPageClient.tsx
"use client";

import { useMemo, useState, useCallback } from "react";
import { addChunkingPipeline, runChunking } from "@/app/api/rag/docs/[doc_id]/chunking/chunking-action";
import { RunButton } from "@/components/custom-ui/RunButton";
import { SaveButton } from "@/components/custom-ui/SaveButton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { EvaluatorEditor } from "@/components/Editors/EvaluatorEditor";
import { ChunkingEditor } from "@/components/Editors/ChunkingEditor";

type MethodSpec = Record<string, any>;
type PipelineSpec = Record<string, MethodSpec[]>;

type RoutingEditorProps = {
  pipelineKey: string;
  methods: MethodSpec[];
  onChange: (methods: MethodSpec[]) => void;
};

function RoutingEditor({ pipelineKey, methods, onChange }: RoutingEditorProps) {
  if (pipelineKey === "evaluator") {
    return <EvaluatorEditor method={methods} onChange={onChange} />;
  }

  if (/^\d+$/.test(pipelineKey)) {
    return <ChunkingEditor methods={methods} onChange={onChange} />;
  }

  return null;
}

function nextPipelineId(pipelines: PipelineSpec): string {
  const numericKeys = Object.keys(pipelines).filter((k) => /^\d+$/.test(k));
  const ids = numericKeys.map(Number);
  const max = ids.length ? Math.max(...ids) : 0;
  return String(max + 1);
}

// Pick a sensible default selection:
// - evaluator if it exists
// - otherwise smallest numeric id if any
// - otherwise "1"
function initialPipelineId(pipeline: PipelineSpec): string {
  if (pipeline.evaluator) return "evaluator";
  const numeric = Object.keys(pipeline).filter((k) => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b);
  return numeric.length ? String(numeric[0]) : "1";
}

export default function ChunkingPageClient({
  doc_id,
  initialPipeline,
}: {
  doc_id: string;
  initialPipeline: PipelineSpec;
}) {
  const [pipeline, setPipeline] = useState<PipelineSpec>(initialPipeline);
  const [pipelineId, setPipelineId] = useState<string>(() => initialPipelineId(initialPipeline));

  const currentMethods = useMemo(() => {
    if (!pipelineId) return [];
    return pipeline[pipelineId] ?? [];
  }, [pipeline, pipelineId]);

  const addPipeline = useCallback(() => {
    setPipeline((prev) => {
      const id = nextPipelineId(prev);
      // ensure selection updates
      setPipelineId(id);
      return { ...prev, [id]: [] };
    });
  }, []);

  const addEvaluator = useCallback(() => {
    setPipeline((prev) => {
      if (prev.evaluator) return prev;
      setPipelineId("evaluator");
      return { ...prev, evaluator: [] };
    });
  }, []);

  const deletePipeline = useCallback((id: string) => {
    setPipeline((prev) => {
      const copy = { ...prev };
      delete copy[id];

      if (pipelineId === id) {
        const remainingKeys = Object.keys(copy);

        // prefer evaluator if present, else first numeric, else ""
        const next =
          copy.evaluator
            ? "evaluator"
            : remainingKeys.find((k) => /^\d+$/.test(k)) ?? "";

        setPipelineId(next);
      }

      return copy;
    });
  }, [pipelineId]);

  const handleMethodsChange = useCallback((methods: MethodSpec[]) => {
    setPipeline((prev) => {
      if (!pipelineId) return prev;

      if (pipelineId === "evaluator") {
        return { ...prev, evaluator: methods };
      }
      return { ...prev, [pipelineId]: methods };
    });
  }, [pipelineId]);

  const pipelineJson = useMemo(() => JSON.stringify(pipeline), [pipeline]);


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
          gap: 8,
        }}
      >
        {Object.keys(pipeline).map((id) => (
          <div key={id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => setPipelineId(id)}
              style={{
                flex: 1,
                fontWeight: pipelineId === id ? "bold" : "normal",
                background: pipelineId === id ? "#eee" : "transparent",
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

        <button onClick={addPipeline}>+ Add Pipeline</button>

        <button onClick={addEvaluator} disabled={!!pipeline.evaluator}>
          + Add Evaluator
        </button>
      </div>

      {/* ---------- Main ---------- */}
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
          <form action={addChunkingPipeline} style={{ margin: 0 }}>
            <input type="hidden" name="doc_id" value={doc_id} />
            <input type="hidden" name="pipeline" value={pipelineJson} />
            <SaveButton label="Pipeline" />
          </form>

          <form action={runChunking} style={{ margin: 0 }}>
            <input type="hidden" name="doc_id" value={doc_id} />
            <RunButton label="Chunking" />
          </form>
        </div>

        <RoutingEditor
          pipelineKey={pipelineId}
          methods={currentMethods}
          onChange={handleMethodsChange}
        />
      </div>
    </div>
  );
}
