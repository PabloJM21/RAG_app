import { redirect } from "next/navigation";
import { listSavedProjects } from "@/app/api/rag/projects/projects-action";

export default async function RagIndexPage() {
  const projects = await listSavedProjects();

  if (projects.length > 0) {
    redirect(`/home/rag/${projects[0].project_id}`);
  }

  redirect("/home/rag/evaluator");
}