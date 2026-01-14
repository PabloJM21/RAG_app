import IndexingPageContent from "./IndexingPageContent";

export default async function IndexingPage({
  params,
}: {
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;
  return <IndexingPageContent doc_id={doc_id} />;
}