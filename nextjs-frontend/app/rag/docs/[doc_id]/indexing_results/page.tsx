"use client";

import {useEffect, useState} from "react";
import {fetchResults, addResults} from "@/app/rag/api/docs/[doc_id]/indexing_results/table-action";
import {ExtractionEditor} from "@/app/rag/docs/[doc_id]/extraction/page";
import {addPipeline} from "@/app/rag/api/docs/[doc_id]/indexing/indexing-action";

type Item = {
  retrieval_id: number;
  title: string;
  content: string;
};

type LevelResult = {
  level: string;
  items: Item[];
};

type Results = LevelResult[]




export function TableEditor({
  doc_id,
  methods
}: {
  doc_id: string;
  methods: Results;
}) {
  const [results, setResults] =
    useState<Results>(methods);

  const [edited, setEdited] =
      useState<Set<string>>(new Set());

  /* ---------------- Helpers ---------------- */

  function updateContent(levelIndex: number, itemIndex: number, newContent: string) {
    const copy = [...results];
    const levelResult = copy[levelIndex];
    const items = [...levelResult.items];

    items[itemIndex] = {
    ...items[itemIndex],
    content: newContent
    };

    copy[levelIndex] = { ...levelResult, items };
    setResults(copy);

    // mark edited
    setEdited(prev => {
    const next = new Set(prev);
    next.add(`${levelIndex}:${itemIndex}`);
    return next;
    });
    }

  function buildFilteredResults() {
    return results.map((levelResult, levelIndex) => ({
    level: levelResult.level,
    items: levelResult.items.filter((_, itemIndex) =>
      edited.has(`${levelIndex}:${itemIndex}`)
    )
    })).filter(levelResult => levelResult.items.length > 0); // remove empty levels
    }



  /* ---------------- Render ---------------- */

  return (
    <section>
      <h2>Indexing Results</h2>

      {/* ---------- Levels row + save ---------- */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "stretch",
          overflowX: "auto",
          paddingBottom: 8
        }}
      >
        {/* ---------- Level boxes ---------- */}
        {results.map((levelResult, levelIndex) => (
          <div
            key={levelResult.level}
            style={{
              border: "1px solid #ccc",
              minWidth: 320,
              maxWidth: 320,
              display: "flex",
              flexDirection: "column"
            }}
          >
            {/* Level header */}
            <div
              style={{
                padding: 8,
                fontWeight: 700,
                borderBottom: "2px solid #aaa",
                background: "#f7f7f7",
                textAlign: "center"
              }}
            >
              {levelResult.level}
            </div>

            {/* Scrollable chunks */}
            <div
              style={{
                padding: 8,
                overflowY: "auto",
                flexGrow: 1,
                maxHeight: 400
              }}
            >
              {levelResult.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  style={{
                    marginBottom: 16,
                    paddingBottom: 12,
                    borderBottom:
                      itemIndex <
                      levelResult.items.length - 1
                        ? "2px solid #ddd"
                        : "none"
                  }}
                >
                  {/* Title */}
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: 4
                    }}
                  >
                    {item.title}
                  </div>

                  {/* Divider */}
                  <div
                    style={{
                      borderTop: "1px solid #ccc",
                      marginBottom: 6
                    }}
                  />

                  {/* Editable content */}
                  <textarea
                    value={item.content}
                    onChange={(e) =>
                      updateContent(
                        levelIndex,
                        itemIndex,
                        e.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      minHeight: 80,
                      resize: "vertical",
                      fontFamily: "inherit"
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ---------- Global save ----------
        <div
          style={{
            minWidth: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            border: "1px dashed #aaa",
            background: "#fafafa"
          }}
        >
          <button
            onClick={addResults}
            style={{
              width: "100%",
              height: 40,
              fontWeight: 600
            }}
          >
            Save All
          </button>
        </div>*/}


        <div style={{ marginTop: 12 }}>
          {
            <form action={addResults}>
              <input
                type="hidden"
                name="doc_id"
                value={doc_id}
              />

              <input
                type="hidden"
                name="results"
                value={JSON.stringify(buildFilteredResults())}
              />

              <button type="submit">
                Save All
              </button>
            </form>
          }
        </div>


      </div>
    </section>
  );
}



export default function TablePage({
  params,
}: {
  params: { doc_id: string };
}) {

  
  const [results, setResults] =
    useState<Results>([]);

  const [loading, setLoading] =
    useState(true);
  
  
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadResults() {
      try {
        const results_data = await fetchResults(params.doc_id);
        setResults(results_data ?? []);
   

      } catch (err: any) {
        setError(err.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, []);

  if (loading) return <div>Loading Indexing Results…</div>;
  if (error)
    return (
      <div style={{ color: "red" }}>
        Error: {error}
      </div>
    );
  
  return (
    <TableEditor
      doc_id={params.doc_id}
      methods={results}
    />
  );
}













