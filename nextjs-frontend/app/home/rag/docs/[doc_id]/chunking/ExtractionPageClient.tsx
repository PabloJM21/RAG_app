// ExtractionPageClient.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import {
  addExtractionPipeline,
  runExtraction,
} from "@/app/api/rag/docs/[doc_id]/extraction/extraction-action";

import {EvaluatorSettingsCard} from "@/components/Editors/EvaluatorEditor";
import { ExtractionEditor } from "@/components/Editors/ExtractionEditor";


import {PipelineTabsBar} from "@/components/custom-ui/PipelineTabsBar";
import {SaveRunActions} from "@/components/custom-ui/SaveRunActions";


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
    return (
      <EvaluatorSettingsCard
        methods={methods}
        onChange={onChange}
        type="Enriching"
      />
    );
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

  const deletePipeline = useCallback(
    (id: string) => {
      setPipeline((prev) => {
        const copy = {...prev};
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
          return {...prev, evaluator: methods};
        }
        return {...prev, [pipelineId]: methods};
      });
    },
    [pipelineId]
  );

  return (
    <div style={{display: "flex", flexDirection: "column", height: "100%"}}>
      {/* ---------- Main ---------- */}
      <div style={{flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <SaveRunActions
            addFunction={addExtractionPipeline}
            runFunction={runExtraction}
            doc_id={doc_id}
            pipelineJson={pipelineJson}
            runLabel="Extraction"
          />
        </div>


        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <RoutingEditor
            pipelineKey={pipelineId}
            methods={currentMethods}
            levels={levels}
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

