"use client";

import {useEffect, useState} from "react";
import {addExtractionPipeline, fetchExtractionPipeline, runExtraction} from "@/app/rag/api/docs/[doc_id]/extraction/extraction-action";
import { fetchLevels } from "@/app/rag/api/docs/[doc_id]/indexing/indexing-action";



type MethodSpec = Record<string, any>;
type PipelineSpec = MethodSpec[]

/* ---------- Domain options ---------- */

const METHOD_TYPES = ["Extractor", "Enricher"] as const;

const EXTRACTOR_WHAT = ["content", "title"];
const ENRICHER_WHAT = ["summary", "questions", "keywords"];
const ENRICHER_MODEL = ["coder", "thinker", "classifier", "generator", "reasoner"]
/* ---------- Templates ---------- */

const EXTRACTOR_TEMPLATE: MethodSpec = {
  type: "Extractor",
  from: "",
  to: "",
  what: "",
  replace: false,
  caption: ""
};

const ENRICHER_TEMPLATE: MethodSpec = {
  type: "Enricher",
  where: "",
  what: "",
  model: "",
  replace: false,
  caption: ""
};

export function ExtractionEditor({
  doc_id,
  methods,
  levels
}: {
  doc_id: string;
  methods: PipelineSpec;
  levels: string[];
}) {


  const [pipeline, setPipeline] =
    useState<PipelineSpec>(methods);

  const [selectedType, setSelectedType] =
    useState<(typeof METHOD_TYPES)[number]>(
      "Extractor"
    );





  /* ---------------- Helpers ---------------- */

  function updatePipeline(
    index: number,
    key: string,
    value: any
  ) {
    const copy = [...pipeline];
    copy[index] = { ...copy[index], [key]: value };
    setPipeline(copy);
  }

  function deleteMethod(index: number) {
    setPipeline(
      pipeline.filter((_, i) => i !== index)
    );
  }

  function addMethod() {
    const template =
      selectedType === "Extractor"
        ? structuredClone(EXTRACTOR_TEMPLATE)
        : structuredClone(ENRICHER_TEMPLATE);

    setPipeline([...pipeline, template]);
  }

  function isCompleteMethod(
  methods: PipelineSpec
  ): methods is MethodSpec[] {
    return methods.every(
      (method) => typeof method?.type === "string"
    );
  }





  /* ---------------- Field renderer ---------------- */

  function renderValueEditor(
    method: Partial<MethodSpec>,
    index: number,
    key: string,
    value: any
  ) {
    // type is fixed
    if (key === "type") {
      return <span>{String(value)}</span>;
    }

    // replace → boolean dropdown
    if (key === "replace") {
      return (
        <select
          value={String(value)}
          onChange={(e) =>
            updatePipeline(
              index,
              key,
              e.target.value === "true"
            )
          }
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    // Extractor-specific dropdowns
    if (
      method.type === "Extractor" &&
      (key === "from" || key === "to")
    ) {
      return (
        <select
          value={value}
          onChange={(e) =>
            updatePipeline(index, key, e.target.value)
          }
        >
          <option value="">—</option>
          {levels.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>
      );
    }

    if (method.type === "Extractor" && key === "what") {
      return (
        <select
          value={value}
          onChange={(e) =>
            updatePipeline(index, key, e.target.value)
          }
        >
          <option value="">—</option>
          {EXTRACTOR_WHAT.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      );
    }

    // Enricher-specific dropdowns
    if (method.type === "Enricher" && key === "where") {
      return (
        <select
          value={value}
          onChange={(e) =>
            updatePipeline(index, key, e.target.value)
          }
        >
          <option value="">—</option>
          {levels.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>
      );
    }

    if (method.type === "Enricher" && key === "what") {
      return (
        <select
          value={value}
          onChange={(e) =>
            updatePipeline(index, key, e.target.value)
          }
        >
          <option value="">—</option>
          {ENRICHER_WHAT.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      );
    }


    if (
      method.type === "Enricher" && key === "model"
    ) {
      return (
        <select
          value={value}
          onChange={(e) =>
            updatePipeline(index, key, e.target.value)
          }
        >
          <option value="">—</option>
          {ENRICHER_MODEL.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      );
    }




    // caption + fallback → free text
    return (
      <input
        type="text"
        value={String(value)}
        onChange={(e) =>
          updatePipeline(index, key, e.target.value)
        }
        style={{ width: "100%" }}
      />
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <section>
      <h2>Extraction</h2>

      {/* ---------- Methods row ---------- */}
      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 8
        }}
      >
        {pipeline.map((method, index) => (
          <div
            key={index}
            style={{
              position: "relative",
              border: "1px solid #ccc",
              padding: 8,
              minWidth: 260
            }}
          >
            {/* ❌ Delete */}
            <button
              onClick={() => deleteMethod(index)}
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                border: "none",
                background: "transparent",
                cursor: "pointer"
              }}
            >
              ❌
            </button>

            <table
              style={{
                borderCollapse: "collapse",
                width: "100%"
              }}
            >
              <tbody>
                {Object.entries(method).map(
                  ([key, value]) => (
                    <tr key={key}>
                      <td
                        style={{
                          borderBottom:
                            "1px solid #eee",
                          padding: 4,
                          fontWeight: 600
                        }}
                      >
                        {key}
                      </td>
                      <td
                        style={{
                          borderBottom:
                            "1px solid #eee",
                          padding: 4
                        }}
                      >
                        {renderValueEditor(
                          method,
                          index,
                          key,
                          value
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* ---------- Add method ---------- */}
      <div style={{ marginTop: 12 }}>
        <select
          value={selectedType}
          onChange={(e) =>
            setSelectedType(
              e.target.value as any
            )
          }
        >
          {METHOD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>{" "}
        <button onClick={addMethod}>
          Add method
        </button>
      </div>

      {/* ---------- Actions ---------- */}


      <div style={{ marginTop: 12 }}>
        {isCompleteMethod(pipeline) && (
          <form action={addExtractionPipeline}>

            <input
              type="hidden"
              name="doc_id"
              value={doc_id}
            />

            <input
              type="hidden"
              name="pipeline"
              value={JSON.stringify(pipeline)}
            />
            <button type="submit">
              Save Pipeline
            </button>
          </form>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {isCompleteMethod(pipeline) && (
          <button
            onClick={() => runExtraction(doc_id)}
            style={{ marginLeft: 8 }}
          >
            Run Extraction
          </button>
        )}
      </div>
    </section>
  );
}







export default function ExtractionPageContent({ doc_id }: { doc_id: string }) {

  const [pipeline, setPipeline] =
    useState<PipelineSpec>([]);
  const [levels, setLevels] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadPipeline() {
      try {
        const pipeline_data = await fetchExtractionPipeline(doc_id);
        setPipeline(pipeline_data ?? []);
        const levels_data = await fetchLevels(doc_id);
        setLevels(levels_data ?? []);

      } catch (err: any) {
        setError(err.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadPipeline();
  }, []);

  if (loading) return <div>Loading pipeline…</div>;
  if (error)
    return (
      <div style={{ color: "red" }}>
        Error: {error}
      </div>
    );



  return (
    <ExtractionEditor
      doc_id={doc_id}
      methods={pipeline}
      levels={levels}
    />
  );
}