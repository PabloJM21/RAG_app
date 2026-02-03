"use client";

import { useState } from "react";
import { addResults } from "@/app/api/rag/docs/[doc_id]/indexing_results/table-action";

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

  function updateContent(
    levelIndex: number,
    itemIndex: number,
    newContent: string
  ) {
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
          edited.has(`${levelIndex}:${itemIndex}`)
        ),
      }))
      .filter((levelResult) => levelResult.items.length > 0);
  }

  return (
    <section>
      <h2>Indexing Results</h2>

      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "stretch",
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {results.map((levelResult, levelIndex) => (
          <div
            key={levelResult.level}
            style={{
              border: "1px solid #ccc",
              minWidth: 320,
              maxWidth: 320,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: 8,
                fontWeight: 700,
                borderBottom: "2px solid #aaa",
                background: "#f7f7f7",
                textAlign: "center",
              }}
            >
              {levelResult.level}
            </div>

            <div
              style={{
                padding: 8,
                overflowY: "auto",
                flexGrow: 1,
                maxHeight: 400,
              }}
            >
              {levelResult.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  style={{
                    marginBottom: 16,
                    paddingBottom: 12,
                    borderBottom:
                      itemIndex < levelResult.items.length - 1
                        ? "2px solid #ddd"
                        : "none",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {item.title}
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid #ccc",
                      marginBottom: 6,
                    }}
                  />

                  <textarea
                    value={item.content}
                    onChange={(e) =>
                      updateContent(levelIndex, itemIndex, e.target.value)
                    }
                    style={{
                      width: "100%",
                      minHeight: 80,
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 12 }}>
          <form action={addResults}>
            <input type="hidden" name="doc_id" value={doc_id} />
            <input
              type="hidden"
              name="results"
              value={JSON.stringify(buildFilteredResults())}
            />
            <button type="submit">Save All</button>
          </form>
        </div>
      </div>
    </section>
  );
}
