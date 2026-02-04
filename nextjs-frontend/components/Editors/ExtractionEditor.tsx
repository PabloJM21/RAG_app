import {useEffect, useState} from "react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {X} from "lucide-react";
import {Button} from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import {FlexibleMethodCard} from "@/components/custom-ui/FlexibleMethodCard";

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

const DEFAULT_METHOD_COLOR = "#ffffff";

const EXTRACTOR_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "Extractor",
  from: "",
  to: "",
  what: "",
  position: "",
  caption: ""
};

const ENRICHER_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "Enricher",
  where: "",
  model: "",
  prompt: "",
  position: "",
  caption: "",
  history: false,
};


const FILTER_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "Filter",
  where: "",
  model: "",
  prompt: "",
  history: false,
};

const RESET_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
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
    onChange(methods.map((m, i) => i === index ? {...m, [key]: value} : m));
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
    method: MethodSpec,
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
            style={{width: "100%"}}
          />

          <datalist id="extractor-captions">
            {EXTRACTOR_CAPTIONS.map((w) => (
              <option key={w} value={w}/>
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
            style={{width: "100%"}}
          />

          <datalist id="enricher-prompts">
            {ENRICHER_PROMPTS.map((w) => (
              <option key={w} value={w}/>
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
            style={{width: "100%"}}
          />

          <datalist id="enricher-captions">
            {ENRICHER_CAPTIONS.map((w) => (
              <option key={w} value={w}/>
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
            style={{width: "100%"}}
          />

          <datalist id="filter-prompts">
            {FILTER_PROMPTS.map((w) => (
              <option key={w} value={w}/>
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
        style={{width: "100%"}}
      />
    );
  }

  /* ---------------- Render ---------------- */


  // keep your Button / X imports as-is

  return (
    <section className="h-full flex flex-col gap-3">
      {/* Top toolbar (fixed at top) */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Extraction</h2>

        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {METHOD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <Button type="button" onClick={addMethod} size="sm">
            + Add method
          </Button>
        </div>
      </div>

      {/* Methods container (blue border card) */}
      <Card className="border-2 border-blue-500/60 rounded-xl w-fit max-w-full min-h-0">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Methods
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0 h-full min-h-0">
          {/* Horizontal scroll area for the method cards */}
          <div className="h-full min-h-0 overflow-x-auto overflow-y-hidden pb-2">
            <div className="flex gap-4 min-w-max">
              {methods.map((method, index) => (
                <div style={{ marginTop: 12 }}>
                  <FlexibleMethodCard
                    method={method}
                    onDelete={() => deleteMethod(index)}
                    renderValue={(key, value) => renderValueEditor(method, index, key, value)}
                    onColorChange={(next) => updatePipeline(index, "color", next)}
                    defaultOpen={false}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {methods.length === 0 && (
            <div className="text-sm text-muted-foreground mt-2">
              No methods yet — add one above.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}