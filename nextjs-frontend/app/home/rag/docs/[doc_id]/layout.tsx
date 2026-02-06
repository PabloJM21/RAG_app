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
    <div className="flex flex-col h-full">
      <header className="border-b border-gray-300 bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <nav className="flex justify-center gap-3">
            <Link href={`/home/rag/docs/${doc_id}/conversion`}>
              <Button variant="secondary" className="w-40 py-3 text-lg">
                Conversion
              </Button>
            </Link>

            <Link href={`/home/rag/docs/${doc_id}/chunking`}>
              <Button variant="secondary" className="w-40 py-3 text-lg">
                Chunking
              </Button>
            </Link>

            <Link href={`/home/rag/docs/${doc_id}/retrieval`}>
              <Button variant="secondary" className="w-40 py-3 text-lg">
                Retrieval
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* adds breathing room so the child's Tabs header doesn't “touch” */}
      <div className="flex-1 pt-3">{children}</div>
    </div>
  );
}

