"use client";

import { useMemo, useState } from "react";
import { addResults } from "@/app/api/rag/docs/[doc_id]/indexing_results/table-action";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {SaveResultsActions} from "@/components/custom-ui/SaveRunActions";

type Item = {
  retrieval_id: number;
  title: string;
  content: string;
};

type LevelResult = {
  level: string;
  items: Item[];
};

export type Results = LevelResult[];

export default function ChunksResultsEditor({
  doc_id,
  initialResults,
}: {
  doc_id: string;
  initialResults: Results;
}) {
  const [results, setResults] = useState<Results>(initialResults);
  const [edited, setEdited] = useState<Set<string>>(new Set());

  function updateContent(levelIndex: number, itemIndex: number, newContent: string) {
    const copy = [...results];
    const levelResult = copy[levelIndex];
    const items = [...levelResult.items];

    items[itemIndex] = {
      ...items[itemIndex],
      content: newContent,
    };

    copy[levelIndex] = { ...levelResult, items };
    setResults(copy);

    setEdited((prev) => {
      const next = new Set(prev);
      next.add(`${levelIndex}:${itemIndex}`);
      return next;
    });
  }

  function buildFilteredResults() {
    return results
      .map((levelResult, levelIndex) => ({
        level: levelResult.level,
        items: levelResult.items.filter((_, itemIndex) =>
          edited.has(`${levelIndex}:${itemIndex}`),
        ),
      }))
      .filter((levelResult) => levelResult.items.length > 0);
  }

  const filtered = useMemo(() => buildFilteredResults(), [results, edited]);
  const editedCount = edited.size;

  return (
    <section className="w-full">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Indexing Results</h2>
          <p className="text-sm text-muted-foreground">
            Edit chunk contents below. Only modified items will be saved.
          </p>
        </div>

        {/* top-right toolbar */}
        <div className="flex justify-end">
          <SaveResultsActions
            addFunction={addResults}
            doc_id={doc_id}
            resultsJson={JSON.stringify(filtered)}
            saveLabel={editedCount === 0 ? "0 changes" : `${editedCount} changes`}
            disabled={editedCount === 0}
          />
        </div>
      </div>

      <div className="relative">
        {/* Horizontal columns */}
        <div className="flex items-stretch gap-4 overflow-x-auto pb-3">
          {results.map((levelResult, levelIndex) => (
            <Card
              key={levelResult.level}
              className="min-w-[340px] max-w-[340px] overflow-hidden"
            >
              <CardHeader className="py-4 bg-muted/40 border-b">
                <CardTitle className="text-base text-center">
                  {levelResult.level}
                </CardTitle>
                <CardDescription className="text-center">
                  {levelResult.items.length} items
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4">
                <div className="max-h-[460px] overflow-y-auto pr-1 space-y-4">
                  {levelResult.items.map((item, itemIndex) => {
                    const key = `${levelIndex}:${itemIndex}`;
                    const isEdited = edited.has(key);

                    return (
                      <div
                        key={itemIndex}
                        className={cn(
                          "rounded-lg border p-3 bg-background",
                          isEdited && "ring-1 ring-foreground/15 bg-muted/20",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="font-medium leading-snug truncate">
                              {item.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Retrieval ID:{" "}
                              <span className="font-mono">{item.retrieval_id}</span>
                            </div>
                          </div>

                          {isEdited && (
                            <span className="text-xs px-2 py-1 rounded-md bg-foreground/5 text-foreground/80">
                              Edited
                            </span>
                          )}
                        </div>

                        <textarea
                          value={item.content}
                          onChange={(e) =>
                            updateContent(levelIndex, itemIndex, e.target.value)
                          }
                          className={cn(
                            "w-full min-h-[96px] resize-y rounded-md border bg-background px-3 py-2 text-sm leading-relaxed",
                            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
