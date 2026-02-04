// ChunkingPageClient.tsx
"use client";

import { useMemo, useState, useCallback } from "react";
import { addChunkingPipeline, runChunking } from "@/app/api/rag/docs/[doc_id]/chunking/chunking-action";
import { RunButton } from "@/components/custom-ui/RunButton";
import { SaveButton } from "@/components/custom-ui/SaveButton";


import { EvaluatorEditor } from "@/components/Editors/EvaluatorEditor";
import { ChunkingEditor } from "@/components/Editors/ChunkingEditor";
import {PipelineTabsBar} from "@/components/custom-ui/PipelineTabsBar";
import {SaveRunActions} from "@/components/custom-ui/SaveRunActions";


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
function initialPipelineId(pipeline: PipelineSpec): string {
  // 1. smallest numeric pipeline id
  const numeric = Object.keys(pipeline)
    .filter((k) => /^\d+$/.test(k))
    .map(Number)
    .sort((a, b) => a - b);
  if (numeric.length > 0) {
    return String(numeric[0]);
  }
  // 2. evaluator if it exists
  if (pipeline.evaluator) {
    return "evaluator";
  }
  // 3. fallback
  return "1";
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
      return {...prev, [id]: []};
    });
  }, []);

  const addEvaluator = useCallback(() => {
    setPipeline((prev) => {
      if (prev.evaluator) return prev;
      setPipelineId("evaluator");
      return {...prev, evaluator: []};
    });
  }, []);

  const deletePipeline = useCallback((id: string) => {
    setPipeline((prev) => {
      const copy = {...prev};
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
        return {...prev, evaluator: methods};
      }
      return {...prev, [pipelineId]: methods};
    });
  }, [pipelineId]);

  const pipelineJson = useMemo(() => JSON.stringify(pipeline), [pipeline]);


  return (
    <div style={{display: "flex", flexDirection: "column", height: "100%"}}>
      {/* ---------- Main ---------- */}
      <div style={{flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <SaveRunActions
            addFunction={addChunkingPipeline}
            runFunction={runChunking}
            doc_id={doc_id}
            pipelineJson={pipelineJson}
            runLabel="Chunking"
          />
        </div>


        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <RoutingEditor
            pipelineKey={pipelineId}
            methods={currentMethods}
            onChange={handleMethodsChange}
          />
        </div>

      </div>


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
