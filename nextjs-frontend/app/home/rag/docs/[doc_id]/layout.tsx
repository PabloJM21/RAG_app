import Link from "next/link";
import type { ReactNode } from "react";
import { DocNav } from "./DocNav"; // adjust path

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
          <DocNav doc_id={doc_id} />
        </div>
      </header>

      <div className="flex-1 pt-3">{children}</div>
    </div>
  );
}
