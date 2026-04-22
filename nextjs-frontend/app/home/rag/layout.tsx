import RagShell from "./RagShell";
import {listSavedProjects} from "@/app/api/rag/projects/projects-action";

export default async function RagLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialproject_ids = await listSavedProjects();

  return (
    <RagShell initialproject_ids={initialproject_ids}>
      {children}
    </RagShell>
  );
}