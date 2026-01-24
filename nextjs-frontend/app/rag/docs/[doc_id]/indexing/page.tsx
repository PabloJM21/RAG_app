import IndexingPageContent from "./IndexingPageContent";
import IndexingPageSide from "./IndexingPageSide";
import ExtractionPageContent from "./ExtractionPageContent";

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
      {/* LEFT COLUMN */}
      <aside
        style={{
          borderRight: "1px solid #ddd",
          padding: 12,
          overflow: "auto",
        }}
      >
        <IndexingPageSide doc_id={doc_id} />
      </aside>

      {/* RIGHT COLUMN — vertical split */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: "1fr 1fr",
          overflow: "hidden",
        }}
      >
        {/* TOP RIGHT */}
        <section
          style={{
            padding: 16,
            overflow: "auto",
            borderBottom: "1px solid #ddd",
          }}
        >
          <IndexingPageContent doc_id={doc_id} />
        </section>

        {/* BOTTOM RIGHT */}
        <section
          style={{
            padding: 16,
            overflow: "auto",
          }}
        >
          <ExtractionPageContent doc_id={doc_id} />
        </section>
      </div>
    </div>
  );
}

