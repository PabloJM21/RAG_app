import ConversionPageClient from "@/app/home/rag/docs/[doc_id]/conversion/ConversionPageClient";
import { fetchConversionPipeline } from "@/app/api/rag/docs/[doc_id]/conversion/conversion-action";

type MethodSpec = Record<string, any>;

export default async function IndexingPage({
  params,
}: {
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;

  const conversionPipeline = await fetchConversionPipeline(doc_id);

  return (
    <div className="h-screen overflow-hidden">
      <div className="h-full overflow-auto p-4">
        <div className="mx-auto max-w-5xl">
          <ConversionPageClient
            doc_id={doc_id}
            pipeline={(conversionPipeline ?? {}) as MethodSpec}
          />
        </div>
      </div>
    </div>
  );
}