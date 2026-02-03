// ExtractionPageClient.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import {
  addExtractionPipeline,
  runExtraction,
} from "@/app/api/rag/docs/[doc_id]/extraction/extraction-action";

import { EvaluatorEditor } from "@/components/Editors/EvaluatorEditor";
import { ExtractionEditor } from "@/components/Editors/ExtractionEditor";

import { RunButton } from "@/components/custom-ui/RunButton";
import { SaveButton } from "@/components/custom-ui/SaveButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {PipelineTabsBar} from "@/components/custom-ui/PipelineTabsBar";

type MethodSpec = Record<string, any>;
type PipelineSpec = Record<string, MethodSpec[]>;

type RoutingEditorProps = {
  pipelineKey: string;
  methods: MethodSpec[];
  levels: string[];
  onChange: (methods: MethodSpec[]) => void;
};

function RoutingEditor({ pipelineKey, methods, levels, onChange }: RoutingEditorProps) {
  if (pipelineKey === "evaluator") {
    return <EvaluatorEditor method={methods} onChange={onChange} />;
  }

  if (/^\d+$/.test(pipelineKey)) {
    return <ExtractionEditor methods={methods} levels={levels} onChange={onChange} />;
  }

  return null;
}

function nextPipelineId(pipelines: PipelineSpec): string {
  const numericKeys = Object.keys(pipelines).filter((k) => /^\d+$/.test(k));
  const ids = numericKeys.map(Number);
  const max = ids.length ? Math.max(...ids) : 0;
  return String(max + 1);
}

// Choose a stable initial selection:
// - evaluator if it exists
// - else smallest numeric pipeline id
// - else "1"
function initialPipelineId(pipeline: PipelineSpec): string {
  if (pipeline.evaluator) return "evaluator";
  const numeric = Object.keys(pipeline)
    .filter((k) => /^\d+$/.test(k))
    .map(Number)
    .sort((a, b) => a - b);
  return numeric.length ? String(numeric[0]) : "1";
}

export default function ExtractionPageClient({
  doc_id,
  initialPipeline,
  levels,
}: {
  doc_id: string;
  initialPipeline: PipelineSpec;
  levels: string[];
}) {
  const [pipeline, setPipeline] = useState<PipelineSpec>(initialPipeline);
  const [pipelineId, setPipelineId] = useState<string>(() => initialPipelineId(initialPipeline));

  const currentMethods = useMemo(() => {
    if (!pipelineId) return [];
    return pipeline[pipelineId] ?? [];
  }, [pipeline, pipelineId]);

  const pipelineJson = useMemo(() => JSON.stringify(pipeline), [pipeline]);

  const addPipeline = useCallback(() => {
    setPipeline((prev) => {
      const id = nextPipelineId(prev);
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

  const deletePipeline = useCallback(
    (id: string) => {
      setPipeline((prev) => {
        const copy = { ...prev };
        delete copy[id];

        if (pipelineId === id) {
          // prefer evaluator if present, else first numeric, else ""
          const next =
            copy.evaluator
              ? "evaluator"
              : Object.keys(copy).find((k) => /^\d+$/.test(k)) ?? "";

          setPipelineId(next);
        }

        return copy;
      });
    },
    [pipelineId]
  );

  const handleMethodsChange = useCallback(
    (methods: MethodSpec[]) => {
      setPipeline((prev) => {
        if (!pipelineId) return prev;

        if (pipelineId === "evaluator") {
          return { ...prev, evaluator: methods };
        }
        return { ...prev, [pipelineId]: methods };
      });
    },
    [pipelineId]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

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
          <form action={addExtractionPipeline} style={{ margin: 0 }}>
            <input type="hidden" name="doc_id" value={doc_id} />
            <input type="hidden" name="pipeline" value={pipelineJson} />
            <SaveButton label="Pipeline" />
          </form>

          <form action={runExtraction} style={{ margin: 0 }}>
            <input type="hidden" name="doc_id" value={doc_id} />
            <RunButton label="Extraction" />
          </form>
        </div>

        <RoutingEditor
          pipelineKey={pipelineId}
          methods={currentMethods}
          levels={levels}
          onChange={handleMethodsChange}
        />
      </div>
      {/* ---------- Side pane (BOTTOM) ---------- */}
      <PipelineTabsBar
        pipeline={pipeline}
        pipelineId={pipelineId}
        setPipelineId={setPipelineId}
        addPipeline={addPipeline}
        addEvaluator={addEvaluator}
        deletePipeline={deletePipeline}
      />

    </div>
  );
}
