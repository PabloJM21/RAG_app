import MainPipelinePage from "./main-pipeline/page";
import { setCurrentProject } from "@/app/api/rag/projects/projects-action";

export default async function RagProjectPage({
  params,
}: {
  params: Promise<{ project_id: string }>;
}) {
  const { project_id } = await params;

  await setCurrentProject(project_id);

  return <MainPipelinePage project_id={project_id} />;
}