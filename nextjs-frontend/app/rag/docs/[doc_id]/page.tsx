import { addChunkingPipeline, fetchChunkingPipeline, runChunking, fetchLevels } from "@/app/rag/api/docs/[doc_id]/chunking/chunking-action";
import {addExtractionPipeline, fetchExtractionPipeline, runExtraction} from "@/app/rag/api/docs/[doc_id]/extraction/extraction-action";
import {fetchResults, addResults} from "@/app/rag/api/docs/[doc_id]/indexing_results/table-action";
import {addRetrievalPipeline, fetchRetrievalPipeline} from "@/app/rag/api/docs/[doc_id]/retrieval/retrieval-action";

export default function DocPage() {
  return null;
}
