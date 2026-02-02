"use client";

import { useEffect, useState } from "react";
import { fetchPipeline } from "@/app/api/rag/main-pipeline/pipeline-action";
import { MainPipelineEditor } from "./MainPipelineEditor";

type MethodSpec = Record<string, any>;
type PipelineSlot = "router" | "reranker" | "generator";
type PipelineSpec = Partial<Record<PipelineSlot, MethodSpec>>;

export default function MainPipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineSpec>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPipeline() {
      try {
        const data = await fetchPipeline();
        setPipeline(data ?? {});
      } catch (err: any) {
        setError(err.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    loadPipeline();
  }, []);

  if (loading) return <div>Loading pipeline…</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return <MainPipelineEditor initialPipeline={pipeline} />;
}
