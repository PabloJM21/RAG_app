import IndexingTabs from "./IndexingTabs";

import { fetchExtractionPipeline } from "@/app/api/rag/docs/[doc_id]/extraction/extraction-action";
import {
  fetchLevels,
  fetchChunkingPipeline,
} from "@/app/api/rag/docs/[doc_id]/chunking/chunking-action";

import { fetchResults } from "@/app/api/rag/docs/[doc_id]/indexing_results/table-action";


type MethodSpec = Record<string, any>;
type PipelineSpec = Record<string, MethodSpec[]>;

export default async function IndexingPage({
  params,
}: {
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;

  const [chunkingPipeline, extractionPipeline, levels, results] = await Promise.all([
    fetchChunkingPipeline(doc_id),
    fetchExtractionPipeline(doc_id),
    fetchLevels(doc_id),
    fetchResults(doc_id),
  ]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <IndexingTabs
          doc_id={doc_id}
          initialChunking={(chunkingPipeline ?? {}) as PipelineSpec}
          initialExtraction={(extractionPipeline ?? {}) as PipelineSpec}
          levels={(levels ?? []) as string[]}
          results={(results ?? [])}
        />
      </div>
    </div>
  );
}
