import ConversionTabs from "@/app/rag/docs/[doc_id]/conversion/ConversionTabs";
import {fetchConversionPipeline} from "@/app/api/rag/docs/[doc_id]/conversion/conversion-action";
import {fetchProcessingPipeline} from "@/app/api/rag/docs/[doc_id]/conversion_processing/processing-action";

type MethodSpec = Record<string, any>;


export default async function IndexingPage({
  params,
}: {
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;

  const [ConversionPipeline, ProcessingPipeline] = await Promise.all([
    fetchConversionPipeline(doc_id),
    fetchProcessingPipeline(doc_id),
  ]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <ConversionTabs
          doc_id={doc_id}
          initialConversion={(ConversionPipeline ?? {}) as MethodSpec}
          initialProcessing={(ProcessingPipeline ?? []) as MethodSpec[]}
        />
      </div>
    </div>
  );
}


