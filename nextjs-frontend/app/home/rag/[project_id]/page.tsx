import DocsPage from "./docs/page";
import MainPipelinePage from "./main-pipeline/page";
import { ResizableSplit } from "@/components/custom-ui/ResizableSplit";

export default async function RagProjectPage({
  params,
}: {
  params: Promise<{ project_id: string }>;
}) {
  const { project_id } = await params;

  return (
    <ResizableSplit
      height="calc(100vh - 160px)"
      initialLeftWidth={300}
      minLeftWidth={240}
      minRightWidth={420}
      left={
        <aside
          style={{
            border: "1px solid var(--theme-card-border)",
            padding: 12,
            overflow: "auto",
            background: "var(--theme-inner-panel-bg)",
            color: "var(--theme-page-fg)",
            borderRadius: 12,
            height: "100%",
            boxShadow: "var(--theme-card-shadow)",
          }}
        >
          <DocsPage project_id={project_id} />
        </aside>
      }
      right={
        <div
          style={{
            overflow: "auto",
            background: "var(--theme-inner-panel-bg)",
            color: "var(--theme-page-fg)",
            border: "1px solid var(--theme-card-border)",
            borderRadius: 12,
            padding: 16,
            height: "100%",
            boxShadow: "var(--theme-card-shadow)",
          }}
        >
          <MainPipelinePage project_id={project_id} />
        </div>
      }
    />
  );
}