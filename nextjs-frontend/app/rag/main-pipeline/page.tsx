import { fetchPipeline } from "@/app/api/rag/main-pipeline/pipeline-action";
import { MainPipelineEditor } from "./MainPipelineEditor";

type MethodSpec = Record<string, any>;
type PipelineSlot = "router" | "reranker" | "generator";
type PipelineSpec = Partial<Record<PipelineSlot, MethodSpec>>;

export default async function MainPipelinePage() {
  let pipeline: PipelineSpec = {};
  let error: string | null = null;

  try {
    const data = await fetchPipeline();
    pipeline = (data ?? {}) as PipelineSpec;
  } catch (err: any) {
    error = err?.message ?? "Unknown error";
    console.error("Failed to fetch main pipeline", err);
  }

  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return <MainPipelineEditor initialPipeline={pipeline} />;
}
