import TablePageContent from "./TablePageContent";

export default async function TablePage({
  params,
}: {
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;

  return <TablePageContent doc_id={doc_id} />;
}
