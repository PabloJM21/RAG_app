import {EvaluatorSettingsCard} from "@/app/home/rag/evaluator/EvaluatorEditor";

export default function EvaluatorPageClient({
  doc_id,
  initialPipeline,
  colors,
}: {
  doc_id: string;
  initialPipeline: PipelineSpec;
  colors: StageColors;
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
          <EvaluatorSettingsCard
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
