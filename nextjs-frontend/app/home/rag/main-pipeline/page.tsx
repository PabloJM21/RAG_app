import {fetchGenerator, fetchRetrievers} from "@/app/api/rag/main-pipeline/pipeline-action";
import MainPipelineTabs from "./MainPipelineTabs";


type MethodSpec = Record<string, any>;

export default async function MainPipelinePage() {


  const [Generator, Retrievers] = await Promise.all([
    fetchGenerator(),
    fetchRetrievers(),
  ]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <MainPipelineTabs
          initialGenerator={(Generator ?? {}) as MethodSpec}
          initialRetrievers={(Retrievers ?? []) as MethodSpec[]}
        />
      </div>
    </div>
  );
}