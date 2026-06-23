import { fetchRetrievers } from "@/api/rag/main-pipeline/pipeline-action";
import RetrieversPageClient from "./RetrieversPageClient";

type MethodSpec = Record<string, any>;

export default async function MainPipelinePage({
  project_id,
}: {
  project_id: string;
}) {
  const retrievers = await fetchRetrievers(project_id);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4">
        <RetrieversPageClient
          project_id={project_id}
          pipeline={(retrievers ?? []) as MethodSpec[]}
        />
      </div>
    </div>
  );
}