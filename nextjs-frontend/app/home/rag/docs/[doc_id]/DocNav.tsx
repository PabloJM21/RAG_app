"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DocNav({ doc_id }: { doc_id: string }) {
  const pathname = usePathname();

  const items = [
    { label: "Conversion", href: `/home/rag/docs/${doc_id}/conversion` },
    { label: "Chunking", href: `/home/rag/docs/${doc_id}/chunking` },
    { label: "Retrieval", href: `/home/rag/docs/${doc_id}/retrieval` },
  ];

  return (
    <nav className="flex justify-center gap-3">
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? "default" : "secondary"}
              className="w-40 py-3 text-lg"
            >
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}
