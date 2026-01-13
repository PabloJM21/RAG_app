
export default function DocLayout({
  indexing_results,
  indexing,
  extraction,
  retrieval,
}: {
  indexing_results: React.ReactNode;
  indexing: React.ReactNode;
  extraction: React.ReactNode;
  retrieval: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        height: "100vh",
      }}
    >
      <section style={{ borderRight: "1px solid #ddd", padding: 12, overflow: "auto" }}>
        {indexing_results}
      </section>

      <section style={{ borderRight: "1px solid #ddd", padding: 12, overflow: "auto" }}>
        {indexing}
      </section>

      <section style={{ borderRight: "1px solid #ddd", padding: 12, overflow: "auto" }}>
        {extraction}
      </section>

      <section style={{ padding: 12, overflow: "auto" }}>
        {retrieval}
      </section>
    </div>
  );
}
