import { addIndexPipeline, fetchIndexPipeline, runIndexing } from "@/app/rag/api/docs/[doc_id]/indexing/indexing-action";
import {addExtractionPipeline, fetchExtractionPipeline, fetchLevels, runExtraction} from "@/app/rag/api/docs/[doc_id]/extraction/extraction-action";
import {fetchResults, addResults} from "@/app/rag/api/docs/[doc_id]/indexing_results/table-action";
import {addRetrievalPipeline, fetchRetrievalPipeline} from "@/app/rag/api/docs/[doc_id]/retrieval/retrieval-action";

export default function DocPage() {
  return null;
}
