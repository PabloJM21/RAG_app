
import {fetchRetrievalPipeline} from "@/app/api/rag/docs/[doc_id]/retrieval/retrieval-action";
import { fetchLevels } from "@/app/api/rag/docs/[doc_id]/chunking/chunking-action";
import RetrievalPageClient from "@/app/home/rag/docs/[doc_id]/retrieval/RetrievalPageClient";



type MethodSpec = Record<string, any>;


export default async function RetrievalPage({
  params,
}: {
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;

  const [retrievalPipeline, levels] = await Promise.all([
    fetchRetrievalPipeline(doc_id),
    fetchLevels(doc_id),
  ]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <RetrievalPageClient
          doc_id={doc_id}
          pipeline={(retrievalPipeline ?? []) as MethodSpec[]}
          levels={(levels ?? []) as string[]}
        />
      </div>
    </div>
  );
}


