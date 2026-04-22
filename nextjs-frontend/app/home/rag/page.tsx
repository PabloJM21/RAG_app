// app/home/rag/page.tsx
import { redirect } from "next/navigation";
import {listSavedProjects} from "@/app/api/rag/projects/projects-action";


export default async function RagIndexPage() {
  const project_ids = await listSavedProjects();
  const sorted = [...project_ids].sort((a, b) => a - b);

  if (sorted.length > 0) {
    redirect(`/home/rag/${sorted[0]}`);
  }

  redirect("/home/rag/evaluator");
}