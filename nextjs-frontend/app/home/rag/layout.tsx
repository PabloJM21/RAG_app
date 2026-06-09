import RagShell from "./RagShell";
import { listSavedProjects } from "@/app/api/rag/projects/projects-action";

export default async function RagLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const projects = await listSavedProjects();

  return <RagShell initialProjects={projects}>{children}</RagShell>;
}