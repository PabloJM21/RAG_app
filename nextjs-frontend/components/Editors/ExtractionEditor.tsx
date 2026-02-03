import {useEffect, useState} from "react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {X} from "lucide-react";
import {Button} from "@/components/ui/button";

type MethodSpec = Record<string, any>;
type PipelineSpec = MethodSpec[]

/* ---------- Domain options ---------- */

const METHOD_TYPES = ["Extractor", "Enricher", "Filter", "Reset"] as const;

const EXTRACTOR_WHAT = ["content", "title"];
const EXTRACTOR_CAPTIONS = ["A section title of this document", "Context"]

const ENRICHER_POSITION = ["top", "bottom", "replace"];
const ENRICHER_MODELS = ["coder", "thinker", "classifier", "generator", "reasoner"]
const ENRICHER_PROMPTS = ["A concise 1-2 sentence summary of the chunk in the same language.", "A list of 5-7 key topics or entities mentioned in this chunk in the same language.", "A list of 3-5 questions this chunk could answer."]
const ENRICHER_CAPTIONS = ["Summary", "Key Words", "Hypothetical Questions"]

const FILTER_PROMPTS = ["A boolean that is True if the chunk's content could be study material, and False if it's empty or personal data.", "A boolean that is False if the chunk's content doesn't align with the provided context, and True otherwise"]

/* ---------- Templates ---------- */

const EXTRACTOR_TEMPLATE: MethodSpec = {
  type: "Extractor",
  from: "",
  to: "",
  what: "",
  position: "",
  caption: ""
};

const ENRICHER_TEMPLATE: MethodSpec = {
  type: "Enricher",
  where: "",
  model: "",
  prompt: "",
  position: "",
  caption: "",
  history: false,
};


const FILTER_TEMPLATE: MethodSpec = {
  type: "Filter",
  where: "",
  model: "",
  prompt: "",
  history: false,
};

const RESET_TEMPLATE: MethodSpec = {
  type: "Reset",
  where: ""
};



const TEMPLATE_MAP: Record<(typeof METHOD_TYPES)[number], MethodSpec> = {
  Extractor: EXTRACTOR_TEMPLATE,
  Enricher: ENRICHER_TEMPLATE,
  Filter: FILTER_TEMPLATE,
  Reset: RESET_TEMPLATE,
};

function templateFor(
  type: (typeof METHOD_TYPES)[number]
): MethodSpec {
  return structuredClone(TEMPLATE_MAP[type]);
}

export function ExtractionEditor({
  methods,
  levels,
  onChange
}: {
  methods: PipelineSpec;
  levels: string[];
  onChange: (methods: MethodSpec[]) => void;
}) {


  const [selectedType, setSelectedType] =
    useState<(typeof METHOD_TYPES)[number]>(
      "Extractor"
    );

  /* ---------------- Helpers ---------------- */

  function updatePipeline(index: number, key: string, value: any) {
    onChange(methods.map((m, i) => i === index ? { ...m, [key]: value } : m));
  }

  function deleteMethod(index: number) {
    onChange(methods.filter((_, i) => i !== index));
  }

  function addMethod() {
    const template =
      structuredClone(templateFor(selectedType));
    onChange([...methods, template]);
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


    if (typeof value === "boolean") {
      return (
        <select
          value={String(value)}
          onChange={(e) =>
            updatePipeline(index, key, e.target.value === "true")
          }
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    // position → at the top, bottom of original content, or replace it
    if (key === "position") {
      return (
        <select
          value={value}
          onChange={(e) =>
            updatePipeline(index, key, e.target.value)
          }
        >
          <option value="">—</option>
          {ENRICHER_POSITION.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      );
    }

    // Extractor-specific dropdowns
    if (
      key === "from" || key === "to" || key === "where"
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


    // Extractor-specific dropdowns

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


    if (method.type === "Extractor" && key === "caption") {
      return (
        <>
          <input
            list="extractor-captions"
            type="text"
            value={String(value ?? "")}
            onChange={(e) =>
              updatePipeline(index, key, e.target.value)
            }
            style={{ width: "100%" }}
          />

          <datalist id="extractor-captions">
            {EXTRACTOR_CAPTIONS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </>
      );
    }

    // Enricher-specific dropdowns


    if (method.type === "Enricher" && key === "prompt") {
      return (
        <>
          <input
            list="enricher-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) =>
              updatePipeline(index, key, e.target.value)
            }
            style={{ width: "100%" }}
          />

          <datalist id="enricher-prompts">
            {ENRICHER_PROMPTS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </>
      );
    }


    if (method.type === "Enricher" && key === "caption") {
      return (
        <>
          <input
            list="enricher-captions"
            type="text"
            value={String(value ?? "")}
            onChange={(e) =>
              updatePipeline(index, key, e.target.value)
            }
            style={{ width: "100%" }}
          />

          <datalist id="enricher-captions">
            {ENRICHER_CAPTIONS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </>
      );
    }




    if (method.type === "Filter" && key === "prompt") {
      return (
        <>
          <input
            list="filter-prompts"
            type="text"
            value={String(value ?? "")}
            onChange={(e) =>
              updatePipeline(index, key, e.target.value)
            }
            style={{ width: "100%" }}
          />

          <datalist id="filter-prompts">
            {FILTER_PROMPTS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </>
      );
    }


    if (key === "model") {
      return (
        <select
          value={value}
          onChange={(e) =>
            updatePipeline(index, key, e.target.value)
          }
        >
          <option value="">—</option>
          {ENRICHER_MODELS.map((label) => (
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
    <section style={{ position: "relative", height: "100%" }}>
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
        {methods.map((method, index) => (
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
              onClick={() => deleteMethod(index)}
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
                          borderBottom: "1px solid #eee",
                          padding: 4,
                          fontWeight: 600
                        }}
                      >
                        {key}
                      </td>
                      <td
                        style={{
                          borderBottom: "1px solid #eee",
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

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <select
          value={selectedType}
          onChange={(e) =>
            setSelectedType(e.target.value as any)
          }
        >
          {METHOD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button onClick={addMethod}>
          + Add method
        </button>
      </div>
    </section>
  );
}