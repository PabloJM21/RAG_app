import DocsList from "./DocsList";
import { fetchDocs } from "@/api/rag/docs/docs-action";

type Doc = {
  doc_id: string;
  name: string;
};

export default async function DocsPage({
  project_id,
}: {
  project_id: string;
}) {
  let docs: Doc[] = [];
  let error: string | null = null;

  try {
    const data = await fetchDocs(project_id);
    docs = (data ?? []) as Doc[];
  } catch (err: any) {
    console.error("Failed to fetch docs", err);
    error = err?.message ?? "Unknown error";
  }

  return <DocsList project_id={project_id} docs={docs} error={error} />;
}
