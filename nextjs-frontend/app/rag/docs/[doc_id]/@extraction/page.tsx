import ExtractionPageContent from "./ExtractionPageContent";

export default async function ExtractionPage({
  params,
}: {
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;

  return <ExtractionPageContent doc_id={doc_id} />;
}

