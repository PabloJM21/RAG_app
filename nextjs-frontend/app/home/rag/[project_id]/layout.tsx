import { getproject_ids } from "../data";
import {ProjectTabsBar} from "@/components/custom-ui/PipelineTabsBar";

export default async function RagProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ project_id: string }>;
}) {
  const { project_id } = await params;
  const project_ids = await getproject_ids();

  return (
    <div
      style={{
        background: "var(--theme-panel-bg)",
        borderRadius: 12,
        padding: 4,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <ProjectTabsBar
        project_ids={project_ids}
        currentproject_id={project_id}
        basePath="/home/rag"
      />

      {children}
    </div>
  );
}