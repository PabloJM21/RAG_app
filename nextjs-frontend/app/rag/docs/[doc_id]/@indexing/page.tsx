import IndexingPageContent from "./IndexingPageContent";
import IndexingPageSide from "./IndexingPageSide"

export default async function IndexingPage({
  params,
}: {
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        height: "100vh",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid #ddd",
          padding: 12,
          overflow: "auto",
        }}
      >
        <IndexingPageSide doc_id={doc_id} />
      </aside>

      <main
        style={{
          padding: 16,
          overflow: "auto",
        }}
      >
        <IndexingPageContent doc_id={doc_id} />
      </main>
    </div>
  );
}