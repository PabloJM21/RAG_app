"use client";

import { useMemo, useState } from "react";
import {
  addConversionPipeline,
  runConversion,
} from "@/app/api/rag/docs/[doc_id]/conversion/conversion-action";


import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SaveRunActions } from "@/components/custom-ui/SaveRunActions";

/* ---------- Domain options ---------- */

const METHOD_TYPES = ["Custom", "Docling"] as const;

const ENRICHER_MODELS = ["coder", "thinker", "classifier", "generator", "reasoner"]
const REWRITER_PROMPTS = ["A fluent transcription of this table."]
const FILTER_PROMPTS = ["A boolean that is False if the content of the chunk is not scientific, and True otherwise"]


/* ---------- Types ---------- */

type MethodSpec = Record<string, any>;

/* ---------- Templates ---------- */


const CUSTOM_TEMPLATE: MethodSpec = {
  type: "Custom Conversion",

  do_ocr: false,
  ocr_prompt: "Describe the main object and its text captions in detail.",

  keep_tables: true,

  image_filter: false,
  image_filter_model: "",
  image_filter_prompt: "",
  image_rewrite: false,
  image_rewrite_model: "",
  image_rewrite_prompt: "",

  table_filter: false,
  table_filter_model: "",
  table_filter_prompt: "",
  table_rewrite: false,
  table_rewrite_model: "",
  table_rewrite_prompt: "",
};

const DOCLING_TEMPLATE: MethodSpec = {
  type: "Docling Conversion",
  do_ocr: false,
  keep_tables: false,
};

function templateFor(type: (typeof METHOD_TYPES)[number]): MethodSpec {
  switch (type) {
    case "Custom":
      return structuredClone(CUSTOM_TEMPLATE);
    case "Docling":
      return structuredClone(DOCLING_TEMPLATE);
    default:
      return {};
  }
}

function renderConversionField({
  key,
  value,
  updateField,
}: {
  key: string;
  value: any;
  updateField: (key: string, value: any) => void;
}) {
  if (key === "type") {
    return <div className="text-sm font-medium">{String(value ?? "")}</div>;
  }

  if (
    key === "image_rewrite_prompt" ||
    key === "table_rewrite_prompt"
  ) {
    return (
      <>
        <input
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          list="rewriter-prompts"
          type="text"
          value={String(value ?? "")}
          onChange={(e) => updateField(key, e.target.value)}
        />
        <datalist id="rewriter-prompts">
          {REWRITER_PROMPTS.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>
      </>
    );
  }

  if (
    key === "image_filter_prompt" ||
    key === "table_filter_prompt"
  ) {
    return (
      <>
        <input
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          list="filter-prompts"
          type="text"
          value={String(value ?? "")}
          onChange={(e) => updateField(key, e.target.value)}
        />
        <datalist id="filter-prompts">
          {FILTER_PROMPTS.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>
      </>
    );
  }

  if (
    key === "image_rewrite_model" ||
    key === "table_rewrite_model" ||
    key === "image_filter_model" ||
    key === "table_filter_model"
  ) {
    return (
      <select
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        value={value ?? ""}
        onChange={(e) => updateField(key, e.target.value)}
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

  if (typeof value === "boolean") {
    return (
      <select
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        value={String(value)}
        onChange={(e) => updateField(key, e.target.value === "true")}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  return (
    <input
      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      type="text"
      value={String(value ?? "")}
      onChange={(e) => updateField(key, e.target.value)}
    />
  );
}

function fieldLabel(key: string) {
  switch (key) {
    case "image_filter":
    case "table_filter":
      return "filter";

    case "image_filter_model":
    case "table_filter_model":
      return "filter model";

    case "image_filter_prompt":
    case "table_filter_prompt":
      return "filter prompt";

    case "image_rewrite":
    case "table_rewrite":
      return "rewrite";

    case "image_rewrite_model":
    case "table_rewrite_model":
      return "rewrite model";

    case "image_rewrite_prompt":
    case "table_rewrite_prompt":
      return "rewrite prompt";

    default:
      return key.replaceAll("_", " ");
  }
}

function SettingsSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-lg border bg-muted/20" open={defaultOpen}>
      <summary className="cursor-pointer list-none px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{title}</div>
            {description ? (
              <div className="text-xs text-muted-foreground">{description}</div>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">Expand</div>
        </div>
      </summary>

      <div className="border-t p-3 space-y-4">{children}</div>
    </details>
  );
}

export function ConversionSettingsCard({
  method,
  onChange,
}: {
  method: MethodSpec[];
  onChange: (next: MethodSpec[]) => void;
}) {
  const currentMethod = method[0];

  const [selectedType, setSelectedType] = useState<(typeof METHOD_TYPES)[number]>(
    "Custom"
  );

  const hasMethod =
    !!currentMethod &&
    typeof currentMethod.type === "string" &&
    currentMethod.type.length > 0;

  function addMethod() {
    onChange([structuredClone(templateFor(selectedType))]);
  }

  function updateMethod(key: string, value: any) {
    if (!currentMethod) return;
    onChange([{ ...currentMethod, [key]: value }]);
  }

  function deleteMethod() {
    onChange([]);
  }

  const topFields = useMemo(() => {
    if (!currentMethod) return [];
    return ["type"] as string[];
  }, [currentMethod]);

  const imageFields = useMemo(() => {
    if (!currentMethod) return [];

    const fields: string[] = [];

    if ("do_ocr" in currentMethod) {
      fields.push("do_ocr");
      if (currentMethod.do_ocr) {
        fields.push("ocr_prompt");
      }
    }

    if ("image_filter" in currentMethod) {
      fields.push("image_filter");
      if (currentMethod.image_filter) {
        fields.push("image_filter_model", "image_filter_prompt");
      }
    }

    if ("image_rewrite" in currentMethod) {
      fields.push("image_rewrite");
      if (currentMethod.image_rewrite) {
        fields.push("image_rewrite_model", "image_rewrite_prompt");
      }
    }

    return fields;
  }, [currentMethod]);

  const tableFields = useMemo(() => {
    if (!currentMethod) return [];

    const fields: string[] = [];

    if ("keep_tables" in currentMethod) {
      fields.push("keep_tables");
    }

    if ("table_filter" in currentMethod) {
      fields.push("table_filter");
      if (currentMethod.table_filter) {
        fields.push("table_filter_model", "table_filter_prompt");
      }
    }

    if ("table_rewrite" in currentMethod) {
      fields.push("table_rewrite");
      if (currentMethod.table_rewrite) {
        fields.push("table_rewrite_model", "table_rewrite_prompt");
      }
    }

    return fields;
  }, [currentMethod]);

  return (
    <Card className="rounded-xl border bg-card text-card-foreground shadow">
      <CardHeader className="py-4 bg-muted/30 border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion
            </CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              Configure how content is converted and post-processed.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={selectedType}
              onChange={(e) =>
                setSelectedType(e.target.value as (typeof METHOD_TYPES)[number])
              }
            >
              {METHOD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <Button type="button" size="sm" onClick={addMethod}>
              {hasMethod ? "Replace method" : "Add method"}
            </Button>

            {hasMethod && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={deleteMethod}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {hasMethod && currentMethod ? (
          <>
            {topFields.map((key) => (
              <div key={key} className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {fieldLabel(key)}
                </div>
                {renderConversionField({
                  key,
                  value: currentMethod[key],
                  updateField: updateMethod,
                })}
              </div>
            ))}

            <SettingsSection
              title="Image options"
              description="OCR plus image-specific filtering and rewriting."
            >
              {imageFields.map((key) => (
                <div key={key} className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {fieldLabel(key)}
                  </div>
                  {renderConversionField({
                    key,
                    value: currentMethod[key],
                    updateField: updateMethod,
                  })}
                </div>
              ))}
            </SettingsSection>

            <SettingsSection
              title="Table options"
              description="Table retention plus table-specific filtering and rewriting."
            >
              {tableFields.map((key) => (
                <div key={key} className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {fieldLabel(key)}
                  </div>
                  {renderConversionField({
                    key,
                    value: currentMethod[key],
                    updateField: updateMethod,
                  })}
                </div>
              ))}
            </SettingsSection>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            No method yet — add one above.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Page ---------- */

export default function ConversionPageClient({
  doc_id,
  pipeline: initialPipeline,
}: {
  doc_id: string;
  pipeline: MethodSpec;
}) {
  const [pipeline, setPipeline] = useState<MethodSpec[]>(
    initialPipeline ? [initialPipeline] : []
  );

  const pipelineJson = useMemo(
    () => JSON.stringify(pipeline[0] ?? null),
    [pipeline]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          <SaveRunActions
            addFunction={addConversionPipeline}
            runFunction={runConversion}
            doc_id={doc_id}
            pipelineJson={pipelineJson}
            runLabel="Conversion"
          />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <ConversionSettingsCard method={pipeline} onChange={setPipeline} />
        </div>
      </div>
    </div>
  );
}
