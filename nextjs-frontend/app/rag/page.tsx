// app/rag/page.tsx
import DocsPage from "./docs/page";
import MainPipelinePage from "./main-pipeline/page";
import {fetchPipeline} from "@/app/rag/api/main-pipeline/pipeline-action";
import {PipelineSpec} from "@/app/rag/api/main-pipeline/sdk.gen";


// Dynamically import your client components (optional, helps SSR warnings)
//import dynamic from "next/dynamic";


//const DocsPage = dynamic(() => import("./docs/page"), { ssr: false });
//const MainPipelinePage = dynamic(() => import("./main-pipeline/page"), { ssr: false });

export default async function RagIndexPage() {

  const pipeline = (await fetchPipeline()) as PipelineSpec; //This doesn't do shit
  const router = pipeline.router


  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        height: "100vh",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid #ddd",
          padding: 12,
          overflow: "auto",
        }}
      >
        <DocsPage />
      </aside>

      <main
        style={{
          padding: 16,
          overflow: "auto",
        }}
      >
        <MainPipelinePage />
      </main>
    </div>
  );
}
