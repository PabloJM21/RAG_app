import { fetchGenerator, fetchRetrievers } from "@/app/api/rag/main-pipeline/pipeline-action";
import MainPipelineTabs from "./MainPipelineTabs";

type MethodSpec = Record<string, any>;

export default async function MainPipelinePage({
  project_id,
}: {
  project_id: string;
}) {
  const [Generator, Retrievers] = await Promise.all([
    fetchGenerator(project_id),
    fetchRetrievers(project_id),
  ]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <MainPipelineTabs
          project_id={project_id}
          initialGenerator={(Generator ?? {}) as MethodSpec}
          initialRetrievers={(Retrievers ?? []) as MethodSpec[]}
        />
      </div>
    </div>
  );
}