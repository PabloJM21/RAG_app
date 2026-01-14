import RetrievalPageContent from "./RetrievalPageContent";

export default async function RetrievalPage({
  params,
}: {
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;

  return <RetrievalPageContent doc_id={doc_id} />;
}