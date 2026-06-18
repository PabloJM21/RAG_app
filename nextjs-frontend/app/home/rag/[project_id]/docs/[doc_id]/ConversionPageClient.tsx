"use client";

import { useMemo, useState } from "react";
import {
  addConversionPipeline,
  runConversion,
} from "@/app/api/rag/docs/[doc_id]/conversion/conversion-action";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import { SaveRunActions } from "@/components/custom-ui/SaveRunActions";

import {
  themedCardStyle,
  themedCardInnerOverlayStyle,
  themedHeaderStyle,
  themedTopLineStyle,
  themedHeaderGlowStyle,
  themedTitleStyle,
  themedMutedStyle,
  themedLabelStyle,
  themedInputStyle,
  themedContentStyle,
  themedSectionStyle,
  themedSectionTitleStyle,
  themedSectionMutedStyle,
  themedSectionContentStyle,
  themedValueStyle,
} from "@/components/custom-ui/themeStyles";

/* ---------- Domain options ---------- */

const ENRICHER_MODELS = ["coder", "thinker", "classifier", "generator", "reasoner"];
const REWRITER_PROMPTS = ["A fluent transcription of this table."];
const FILTER_PROMPTS = ["A boolean that is False if the content of the chunk is not scientific, and True otherwise"];

/* ---------- Types ---------- */

type MethodSpec = Record<string, any>;

/* ---------- Default config ---------- */

const DEFAULT_CONFIG: MethodSpec = {
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

/* ---------- Helpers ---------- */

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
    return (
      <div className="text-sm font-medium" style={themedValueStyle}>
        {String(value ?? "")}
      </div>
    );
  }

  if (key === "image_rewrite_prompt" || key === "table_rewrite_prompt") {
    return (
      <>
        <input
          className="h-9 w-full rounded-md border px-3 text-sm"
          style={themedInputStyle}
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

  if (key === "image_filter_prompt" || key === "table_filter_prompt") {
    return (
      <>
        <input
          className="h-9 w-full rounded-md border px-3 text-sm"
          style={themedInputStyle}
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
        className="h-9 w-full rounded-md border px-2 text-sm"
        style={themedInputStyle}
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
        className="h-9 w-full rounded-md border px-2 text-sm"
        style={themedInputStyle}
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
      className="h-9 w-full rounded-md border px-3 text-sm"
      style={themedInputStyle}
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
    <details
      className="rounded-lg border"
      style={themedSectionStyle}
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium" style={themedSectionTitleStyle}>
              {title}
            </div>
            {description ? (
              <div className="text-xs" style={themedSectionMutedStyle}>
                {description}
              </div>
            ) : null}
          </div>
          <div className="text-xs" style={themedSectionMutedStyle}>
            Expand
          </div>
        </div>
      </summary>

      <div className="border-t p-3 space-y-4" style={themedSectionContentStyle}>
        {children}
      </div>
    </details>
  );
}

/* ---------- Card ---------- */

export function ConversionSettingsCard({
  method,
  onChange,
}: {
  method: MethodSpec;
  onChange: (next: MethodSpec) => void;
}) {
  function updateField(key: string, value: any) {
    onChange({ ...method, [key]: value });
  }

  const imageFields = useMemo(() => {
    const fields: string[] = [];

    if ("do_ocr" in method) {
      fields.push("do_ocr");
      if (method.do_ocr) fields.push("ocr_prompt");
    }
    if ("image_filter" in method) {
      fields.push("image_filter");
      if (method.image_filter) fields.push("image_filter_model", "image_filter_prompt");
    }
    if ("image_rewrite" in method) {
      fields.push("image_rewrite");
      if (method.image_rewrite) fields.push("image_rewrite_model", "image_rewrite_prompt");
    }

    return fields;
  }, [method]);

  const tableFields = useMemo(() => {
    const fields: string[] = [];

    if ("keep_tables" in method) fields.push("keep_tables");
    if ("table_filter" in method) {
      fields.push("table_filter");
      if (method.table_filter) fields.push("table_filter_model", "table_filter_prompt");
    }
    if ("table_rewrite" in method) {
      fields.push("table_rewrite");
      if (method.table_rewrite) fields.push("table_rewrite_model", "table_rewrite_prompt");
    }

    return fields;
  }, [method]);

  return (
    <Card className="rounded-xl border shadow" style={themedCardStyle}>
      <div style={themedCardInnerOverlayStyle} />

      <CardHeader className="py-4 border-b" style={themedHeaderStyle}>
        <div style={themedTopLineStyle} />
        <div style={themedHeaderGlowStyle} />

        <div className="relative z-10">
          <CardTitle className="text-sm font-medium" style={themedTitleStyle}>
            Conversion
          </CardTitle>
          <div className="mt-1 text-xs" style={themedMutedStyle}>
            Configure how content is converted and post-processed.
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4" style={themedContentStyle}>

        <SettingsSection
          title="Image options"
          description="OCR plus image-specific filtering and rewriting."
        >
          {imageFields.map((key) => (
            <div key={key} className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-wide" style={themedLabelStyle}>
                {fieldLabel(key)}
              </div>
              {renderConversionField({ key, value: method[key], updateField })}
            </div>
          ))}
        </SettingsSection>

        <SettingsSection
          title="Table options"
          description="Table retention plus table-specific filtering and rewriting."
        >
          {tableFields.map((key) => (
            <div key={key} className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-wide" style={themedLabelStyle}>
                {fieldLabel(key)}
              </div>
              {renderConversionField({ key, value: method[key], updateField })}
            </div>
          ))}
        </SettingsSection>
      </CardContent>
    </Card>
  );
}

/* ---------- Page ---------- */

export default function ConversionPageClient({
  project_id,
  doc_id,
  pipeline: initialPipeline,
}: {
  project_id: string;
  doc_id: string;
  pipeline: MethodSpec;
}) {
  const [pipeline, setPipeline] = useState<MethodSpec>(
    structuredClone({ ...DEFAULT_CONFIG, ...initialPipeline })
  );

  const pipelineJson = useMemo(() => JSON.stringify(pipeline), [pipeline]);

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
            project_id={project_id}
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