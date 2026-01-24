import { redirect } from "next/navigation";

export default async function DocRootPage({
  params,
}: {
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;
  redirect(`/rag/docs/${doc_id}/indexing`);
}

