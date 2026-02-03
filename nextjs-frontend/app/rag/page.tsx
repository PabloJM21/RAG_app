// app/rag/page.tsx
import DocsPage from "./docs/page";
import MainPipelinePage from "./main-pipeline/page";


export default async function RagIndexPage() {



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
        <DocsPage />
      </aside>

      <main
        style={{
          padding: 16,
          overflow: "auto",
        }}
      >
        <MainPipelinePage />
      </main>
    </div>
  );
}
