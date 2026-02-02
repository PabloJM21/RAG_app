// ChunkingPageContent.tsx (Server Component)
import ChunkingPageClient from "./ChunkingPageClient";
import { fetchChunkingPipeline } from "@/app/api/rag/docs/[doc_id]/chunking/chunking-action";

type MethodSpec = Record<string, any>;
type PipelineSpec = Record<string, MethodSpec[]>;

export default async function ChunkingPageContent({ doc_id }: { doc_id: string }) {
  const pipeline = (await fetchChunkingPipeline(doc_id)) ?? ({} as PipelineSpec);

  return <ChunkingPageClient doc_id={doc_id} initialPipeline={pipeline} />;
}
