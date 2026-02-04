import {useEffect, useState} from "react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {FlexibleMethodCard} from "@/components/custom-ui/FlexibleMethodCard";

type MethodSpec = Record<string, any>;

/* ---------- Domain options ---------- */

const METHOD_TYPES = ["Paragraph Chunker", "Hybrid Chunker", "Sliding Chunker", "Enricher", "Filter"] as const;

const BOOLEAN_OPTIONS = ["true", "false"];

const ENRICHER_POSITION = ["top", "bottom", "replace"];
const ENRICHER_MODELS = ["coder", "thinker", "classifier", "generator", "reasoner"]
const ENRICHER_PROMPTS = ["A fluent and complete version of this chunk in the same language."]
const FILTER_PROMPTS = ["A boolean that is False if the specified chunk is not scientific text, and True otherwise"]

const EMBEDDING_MODELS = [
  "intfloat/e5-mistral-7b-instruct",
  "intfloat/multilingual-e5-large-instruct",
  "Qwen/Qwen3-Embedding-4B",
];
/* ---------- Templates ---------- */



const PARAGRAPH_TEMPLATE: MethodSpec = {
  type: "Paragraph Chunker",
  level_name: "",
  separator: "##", // Choose "\n" for paragraphs
  tokenizer_model: "", // if empty, tokens will be characters
  max_tokens: "", // if empty, max tokens of the model will be used //if both are empty, chunks are defined by separator only
  with_title: false,
};



const HYBRID_TEMPLATE: MethodSpec = {
  type: "Hybrid Chunker",
  level_name: "",
  tokenizer_model: "", // can't be empty
  with_title: false, // max_tokens are given by model
};


const SLIDING_TEMPLATE: MethodSpec = {
  type: "Sliding Window Chunker",
  level_name: "",
  tokenizer_model: "", // if empty, tokens will be characters
  max_tokens: "", // Window size. If empty, max_tokens are given by model
  overlap_tokens: "", // Size of the overlap
  with_title: false,
};

const ENRICHER_TEMPLATE: MethodSpec = {
  type: "Enricher",
  model: "",
  prompt: "",
  position: "",
  caption: ""
};


const FILTER_TEMPLATE: MethodSpec = {
  type: "Filter",
  model: "",
  prompt: ""
};


const TEMPLATE_MAP: Record<(typeof METHOD_TYPES)[number], MethodSpec> = {
  "Paragraph Chunker": PARAGRAPH_TEMPLATE,
  "Hybrid Chunker": HYBRID_TEMPLATE,
  "Sliding Chunker": SLIDING_TEMPLATE,
  Enricher: ENRICHER_TEMPLATE,
  Filter: FILTER_TEMPLATE,
};

function templateFor(
  type: (typeof METHOD_TYPES)[number]
): MethodSpec {
  return structuredClone(TEMPLATE_MAP[type]);
}

export function ChunkingEditor({
  methods,
  onChange
}: {
  methods: MethodSpec[];
  onChange: (methods: MethodSpec[]) => void;
}) {
  const [selectedType, setSelectedType] =
    useState<(typeof METHOD_TYPES)[number]>(
      "Paragraph Chunker"
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
    if (key === "type") {
      return <span>{String(value)}</span>;
    }

    if (typeof value === "boolean") {
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

    if (method.type === "Enricher" && key === "position") {
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

    if (key === "tokenizer_model") {
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
    <section className="h-full flex flex-col gap-3">
      {/* Top toolbar (fixed at top) */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Chunking</h2>

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