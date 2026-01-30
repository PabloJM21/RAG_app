import Link from "next/link";
import { Button } from "@/components/ui/button";
import ChunkingPageContent from "./ChunkingPageContent";
import ExtractionPageContent from "./ExtractionPageContent";

export default async function IndexingPage({
  params,
}: {
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;

  return (
    <div className="h-screen flex flex-col">
      {/* HEADER */}
      <header className="flex justify-end mb-4">
        <Link href={`/rag/docs/${doc_id}/chunking/chunks`}>
          <Button variant="outline" className="text-lg px-4 py-2">
            Chunks
          </Button>
        </Link>
      </header>

      {/* CONTENT */}
      <div
        className="flex-1 grid overflow-hidden"
        style={{ gridTemplateRows: "1fr 1fr" }}
      >
        {/* TOP */}
        <section className="p-4 overflow-auto border-b">
          <ChunkingPageContent doc_id={doc_id} />
        </section>

        {/* BOTTOM */}
        <section className="p-4 overflow-auto">
          <ExtractionPageContent doc_id={doc_id} />
        </section>
      </div>
    </div>
  );
}


