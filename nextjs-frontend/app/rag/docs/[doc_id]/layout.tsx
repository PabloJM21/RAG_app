import type { ReactNode } from "react";

export default async function DocRootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid #ddd",
          display: "flex",
          gap: 12,
        }}
      >
        <a href={`/rag/docs/${doc_id}/pipelines`}>Pipeline</a>
        <a href={`/rag/docs/${doc_id}/evaluation`}>Evaluation</a>
      </header>

      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}



