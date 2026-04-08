import {useEffect, useState} from "react";

import {Button} from "@/components/ui/button";


import {FlexibleMethodCard} from "@/components/custom-ui/FlexibleMethodCard";
import {MethodsContainerCard} from "@/components/custom-ui/Containers";

import {ENRICHER_PROMPTS, FILTER_PROMPTS} from "@/components/frontend_data/Prompts"

type MethodSpec = Record<string, any>;
type PipelineSpec = MethodSpec[]
type StageColors = Record<string, string>;

/* ---------- Domain options ---------- */

const METHOD_TYPES = ["Extractor", "Enricher", "Filter", "Reset"] as const;

const EXTRACTOR_WHAT = ["content", "title"];
const EXTRACTOR_CAPTIONS = ["A section title of this document", "Context"]

const ENRICHER_POSITION = ["top", "bottom", "replace"];
const ENRICHER_MODELS = ["coder", "thinker", "classifier", "generator", "reasoner"]
const ENRICHER_CAPTIONS = ["Summary", "Key Words", "Hypothetical Questions"]


/* ---------- Templates ---------- */

const DEFAULT_METHOD_COLOR = "#ffffff";

const EXTRACTOR_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "Extractor",
  input_level: "",
  output_level: "",
  what: "",
  position: "",
  caption: ""
};

const ENRICHER_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "Enricher",
  level: "",
  model: "",
  prompt: "",
  position: "",
  caption: "",
  history: false,
};


const FILTER_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "Filter",
  level: "",
  model: "",
  prompt: "",
  history: false,
};

const RESET_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "Reset",
  level: ""
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

function getMethodColor(method: MethodSpec, colors: StageColors) {
  const type = String(method?.type ?? "");
  return colors[type] ?? "#ffffff";
}

export function EnrichmentEditor({
  methods,
  levels,
  onChange,
  colors,
}: {
  methods: PipelineSpec;
  levels: string[];
  onChange: (methods: MethodSpec[]) => void;
  colors: StageColors;
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
      key === "input_level" || key === "output_level" || key === "level"
    ) {
      return (
        <>
          <input
            list="levels"
            type="text"
            value={String(value ?? "")}
            onChange={(e) =>
              updatePipeline(index, key, e.target.value)
            }
            style={{width: "100%"}}
          />

          <datalist id="levels">
            {levels.map((lvl) => (
              <option key={lvl} value={lvl}/>
            ))}
          </datalist>
        </>
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
      <MethodsContainerCard
        title="Pipeline"
        methods={methods}
        renderMethod={(method, index) => (
          <FlexibleMethodCard
            method={method}
            color={getMethodColor(method, colors)}
            onDelete={() => deleteMethod(index)}
            renderValue={(key, value) => renderValueEditor(method, index, key, value)}
            highlightKeys={["input_level", "output_level", "level"]}
            defaultOpen={false}
          />
        )}
      />
    </section>
  );
}