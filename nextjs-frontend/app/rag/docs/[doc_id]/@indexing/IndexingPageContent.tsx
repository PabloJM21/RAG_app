"use client";

import {useEffect, useState} from "react";
import {addIndexPipeline, fetchIndexPipeline, runIndexing} from "@/app/rag/api/docs/[doc_id]/indexing/indexing-action";




type MethodSpec = Record<string, any>;
type PipelineSpec = MethodSpec[]

/* ---------- Domain options ---------- */

const METHOD_TYPES = ["Paragraph Chunker", "Hybrid Chunker", "Sliding Chunker"] as const;



const EMBEDDING_MODELS = [
  "intfloat/e5-mistral-7b-instruct",
  "intfloat/multilingual-e5-large-instruct",
  "Qwen/Qwen3-Embedding-4B",
];
/* ---------- Templates ---------- */



const PARAGRAPH_TEMPLATE: MethodSpec = {
  type: "Paragraph Chunker",
  name: "",
  separator: "##", // Choose "\n" for paragraphs
  tokenizer_model: "", // if empty, tokens will be characters
  max_tokens: "", // if empty, max tokens of the model will be used
};



const HYBRID_TEMPLATE: MethodSpec = {
  type: "Hybrid Chunker",
  name: "",
  tokenizer_model: "", // can't be empty

};


const SLIDING_TEMPLATE: MethodSpec = {
  type: "Sliding Window Chunker",
  name: "",
  tokenizer_model: "", // if empty, tokens will be characters
  max_tokens: "", // Window size. If empty, max tokens of the model will be used
  overlap_tokens: "", // Size of the overlap
};




const TEMPLATE_MAP: Record<(typeof METHOD_TYPES)[number], MethodSpec> = {
  "Paragraph Chunker": PARAGRAPH_TEMPLATE,
  "Hybrid Chunker": HYBRID_TEMPLATE,
  "Sliding Chunker": SLIDING_TEMPLATE
};

function templateFor(
  type: (typeof METHOD_TYPES)[number]
): MethodSpec {
  return structuredClone(TEMPLATE_MAP[type]);
}

export function IndexingEditor({
  doc_id,
  methods
}: {
  doc_id: string;
  methods: PipelineSpec;
}) {


  const [pipeline, setPipeline] =
    useState<PipelineSpec>(methods);

  const [selectedType, setSelectedType] =
    useState<(typeof METHOD_TYPES)[number]>(
      "Paragraph Chunker"
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
    const template = structuredClone(templateFor(selectedType));
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
    

    if (
      key === "model"
    ) {
      return (
        <select
          value={value}
          onChange={(e) =>
            updatePipeline(index, key, e.target.value)
          }
        >
          <option value="">—</option>
          {EMBEDDING_MODELS.map((label) => (
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
      <h2>Indexing</h2>

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
          <form action={addIndexPipeline}>

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
            onClick={() => runIndexing(doc_id)}
            style={{ marginLeft: 8 }}
          >
            Run Indexing
          </button>
        )}
      </div>
    </section>
  );
}







export default function IndexingPageContent({ doc_id }: { doc_id: string }) {

  const [pipeline, setPipeline] =
    useState<PipelineSpec>([]);

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadPipeline() {
      try {
        const pipeline_data = await fetchIndexPipeline(doc_id);
        setPipeline(pipeline_data ?? []);

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
    <IndexingEditor
      doc_id={doc_id}
      methods={pipeline}
    />
  );
}