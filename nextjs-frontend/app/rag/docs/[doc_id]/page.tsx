
import TablePage from "./indexing_results/page"
import IndexingPage from "./indexing/page"
import ExtractionPage from "./extraction/page";
import RetrievalPage from "./retrieval/page";


export default async function RagIndexPage() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        height: "100vh",
      }}
    >
      <section
        style={{
          borderRight: "1px solid #ddd",
          padding: 12,
          overflow: "auto",
        }}
      >
        <TablePage />
      </section>

      <section
        style={{
          borderRight: "1px solid #ddd",
          padding: 12,
          overflow: "auto",
        }}
      >
        <IndexingPage />
      </section>

      <section
        style={{
          borderRight: "1px solid #ddd",
          padding: 12,
          overflow: "auto",
        }}
      >
        <ExtractionPage />
      </section>

      <section
        style={{
          padding: 12,
          overflow: "auto",
        }}
      >
        <RetrievalPage />
      </section>
    </div>
  );
}