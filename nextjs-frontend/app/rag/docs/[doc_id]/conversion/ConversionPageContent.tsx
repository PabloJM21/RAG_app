"use client";

import { useEffect, useState } from "react";
import { addConversionPipeline, fetchConversionPipeline, runConversion } from "@/app/api/rag/docs/[doc_id]/conversion/conversion-action";
import { RunButton } from "@/components/custom-ui/RunButton"
import { SaveButton } from "@/components/custom-ui/SaveButton"
import {X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
  addProcessingPipeline,
  runProcessing
} from "@/app/api/rag/docs/[doc_id]/conversion_processing/processing-action";
/* ---------- Domain options ---------- */

const METHOD_TYPES = [
  "Custom",
   "Docling",
] as const;


const TABLE_OPTIONS = ["drop", "keep", "convert"];



/* ---------- Types (simple approach) ---------- */

type MethodSpec = Record<string, any>;

// "A detailed transcription of the Markdown Table into readable text"

/* ---------- Templates ---------- */

const CUSTOM_TEMPLATE: MethodSpec = {
  type: "Custom Conversion",
  do_ocr: false,
  image_starting_mark: "[IMAGE_START]",
  image_ending_mark: "[IMAGE_END]",
  prompt: "Describe the main object and its text captions in detail."
};


const DOCLING_TEMPLATE: MethodSpec = {
  type: "Docling Conversion",
  do_ocr: false,
  do_tables: false,
};






function templateFor(
  type: (typeof METHOD_TYPES)[number]
): MethodSpec {
  switch (type) {
    case "Custom":
      return structuredClone(CUSTOM_TEMPLATE);
    case "Docling":
      return structuredClone(DOCLING_TEMPLATE);
    default:
      return {};
  }
}

/* ---------- Component ---------- */

export function ConversionEditor({
  doc_id,
  method
}: {
  doc_id: string;
  method: MethodSpec[];
}) {
  // Pipeline is always an array, but max length = 1
  const [pipeline, setPipeline] = useState<MethodSpec[]>(method);


  const [selectedType, setSelectedType] =
    useState<(typeof METHOD_TYPES)[number]>(
      "Custom"
    );

  /* ---------------- Helpers ---------------- */


  function addMethod() {
    const template = structuredClone(templateFor(selectedType));
    setPipeline([{ ...template, type: selectedType }]);
  }

  function updateMethod(key: string, value: any) {
    if (pipeline.length === 0) return;
    const updated = { ...pipeline[0], [key]: value };
    setPipeline([updated]);
  }

  function deleteMethod() {
    setPipeline([]);
  }



  /* ---------------- Field renderer ---------------- */

  function renderValueEditor(
    key: string,
    value: any
  ) {
    if (key === "type") {
      return <span>{String(value)}</span>;
    }

    if (typeof value === "boolean") {
      return (
        <select
          value={String(value)}
          onChange={(e) =>
            updateMethod(key, e.target.value === "true")
          }
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (key === "tables") {
      return (
        <select
          value={value}
          onChange={(e) => updateMethod(key, e.target.value)}
        >
          <option value="">—</option>
          {TABLE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        value={String(value)}
        onChange={(e) =>
          updateMethod(key, e.target.value)
        }
        style={{ width: "100%" }}
      />
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <section style={{ position: "relative", height: "100%" }}>
      <h2>Document Conversion</h2>

      {/* ---------- Floating actions (top-right) ---------- */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          zIndex: 10,
        }}
      >
        <form action={addConversionPipeline} style={{ margin: 0 }}>
          <input type="hidden" name="doc_id" value={doc_id} />
          <input
            type="hidden"
            name="pipeline"
            value={JSON.stringify(pipeline[0])}
          />
          <SaveButton label="Pipeline" />
        </form>

        <form action={runConversion} style={{ margin: 0 }}>
          <input type="hidden" name="doc_id" value={doc_id} />
          <RunButton label="Conversion" />
        </form>
      </div>

      {/* ---------- Methods row (scrollable) ---------- */}
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMethod()}
              className="absolute top-1 right-1 text-muted-foreground hover:text-destructive"
              aria-label="Delete"
            >
              <X className="h-4 w-4" />
            </Button>

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

      {/* ---------- Add method bar (bottom-left) ---------- */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          display: "flex",
          gap: 8,
          alignItems: "center"
        }}
      >
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
          {pipeline.length === 0
            ? "Add method"
            : "Replace method"}
        </button>
      </div>
    </section>
  );
}


/* ---------- Page ---------- */

export default function ConversionPageContent({ doc_id }: { doc_id: string }) {


  const [methodSpec, setMethodSpec] =
    useState<MethodSpec>({});
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadPipeline() {
      try {
        const data = await fetchConversionPipeline(doc_id);
        setMethodSpec(data ?? {});
      } catch (err: any) {
        setError(err.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadPipeline();
  }, [doc_id]);

  if (loading) return <div>Loading pipeline…</div>;
  if (error)
    return (
      <div style={{ color: "red" }}>
        Error: {error}
      </div>
    );

  return (
    <ConversionEditor doc_id={doc_id} method={[methodSpec]} />
  );
}
