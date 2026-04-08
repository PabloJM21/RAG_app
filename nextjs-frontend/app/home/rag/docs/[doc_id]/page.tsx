import { fetchExtractionPipeline } from "@/app/api/rag/docs/[doc_id]/extraction/extraction-action";
import {
  fetchLevels,
  fetchChunkingPipeline,
} from "@/app/api/rag/docs/[doc_id]/chunking/chunking-action";
import { fetchResults } from "@/app/api/rag/docs/[doc_id]/indexing_results/table-action";
import { fetchConversionPipeline } from "@/app/api/rag/docs/[doc_id]/conversion/conversion-action";
import { fetchRetrievalPipeline } from "@/app/api/rag/docs/[doc_id]/retrieval/retrieval-action";
import { fetchColors } from "@/app/api/rag/settings/colors-action";

import PipelineTabs from "@/app/home/rag/docs/[doc_id]/PipelineTabs";

type MethodSpec = Record<string, any>;
type PipelineSpec = Record<string, MethodSpec[]>;
type StageColors = Record<string, string>;
type ColorsSpec = {
  Chunking?: StageColors;
  Enriching?: StageColors;
  Retrieval?: StageColors;
};

export default async function DocRootPage({
  params,
}: {
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;

  const conversionPipeline = await fetchConversionPipeline(doc_id);

  const [chunkingPipeline, extractionPipeline, levels, results, colors] =
    await Promise.all([
      fetchChunkingPipeline(doc_id),
      fetchExtractionPipeline(doc_id),
      fetchLevels(doc_id),
      fetchResults(doc_id),
      fetchColors(),
    ]);

  const retrievalPipeline = await fetchRetrievalPipeline(doc_id);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <PipelineTabs
          doc_id={doc_id}
          initialConversion={(conversionPipeline ?? {}) as MethodSpec}
          initialChunking={(chunkingPipeline ?? {}) as PipelineSpec}
          initialEnrichment={(extractionPipeline ?? {}) as PipelineSpec}
          levels={(levels ?? []) as string[]}
          results={results ?? []}
          initialRetrieval={(retrievalPipeline ?? []) as MethodSpec[]}
          colors={(colors ?? {}) as ColorsSpec}
        />
      </div>
    </div>
  );
}