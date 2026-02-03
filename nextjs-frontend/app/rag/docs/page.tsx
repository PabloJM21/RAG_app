// app/.../DocsPage.tsx (or app/.../page.tsx)
import DocsList from "./DocsList";
import { fetchDocs } from "@/app/api/rag/docs/docs-action";

type Doc = {
  doc_id: string;
  name: string;
};

export default async function DocsPage() {
  let docs: Doc[] = [];
  let error: string | null = null;

  try {
    const data = await fetchDocs();
    docs = (data ?? []) as Doc[];
  } catch (err: any) {
    console.error("Failed to fetch docs", err);
    error = err?.message ?? "Unknown error";
  }

  return <DocsList docs={docs} error={error} />;
}
