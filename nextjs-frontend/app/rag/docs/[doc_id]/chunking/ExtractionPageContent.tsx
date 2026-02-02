// ExtractionPageContent.tsx (Server Component)
import ExtractionPageClient from "./ExtractionPageClient";
import { fetchExtractionPipeline } from "@/app/api/rag/docs/[doc_id]/extraction/extraction-action";
import { fetchLevels } from "@/app/api/rag/docs/[doc_id]/chunking/chunking-action";

type MethodSpec = Record<string, any>;
type PipelineSpec = Record<string, MethodSpec[]>;

export default async function ExtractionPageContent({ doc_id }: { doc_id: string }) {
  const [pipeline, levels] = await Promise.all([
    fetchExtractionPipeline(doc_id),
    fetchLevels(doc_id),
  ]);

  return (
    <ExtractionPageClient
      doc_id={doc_id}
      initialPipeline={(pipeline ?? {}) as PipelineSpec}
      levels={(levels ?? []) as string[]}
    />
  );
}
