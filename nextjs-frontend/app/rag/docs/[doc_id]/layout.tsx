import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export default async function DocRootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;

  return (
    <div className="h-screen flex flex-col">
      <header className="relative border-b border-gray-300 py-3">
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="grid grid-cols-4 gap-4">
            <Link href={`/rag/docs/${doc_id}/indexing`}>
              <Button variant="outline" className="w-40 text-lg py-3">
                Indexing
              </Button>
            </Link>

            <Link href={`/rag/docs/${doc_id}/results`}>
              <Button variant="outline" className="w-40 text-lg py-3">
                Chunks
              </Button>
            </Link>

            <Link href={`/rag/docs/${doc_id}/retrieval`}>
              <Button variant="outline" className="w-40 text-lg py-3">
                Retrieval
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
