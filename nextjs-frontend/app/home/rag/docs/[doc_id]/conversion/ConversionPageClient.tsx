"use client";

import { useMemo, useState } from "react";
import {
  addConversionPipeline,
  runConversion,
} from "@/app/api/rag/docs/[doc_id]/conversion/conversion-action";

import { Button } from "@/components/ui/button";
import { SaveRunActions } from "@/components/custom-ui/SaveRunActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlexibleMethodCard } from "@/components/custom-ui/FlexibleMethodCard";
import {MethodsContainerCard} from "@/components/custom-ui/Containers";

/* ---------- Domain options ---------- */

const METHOD_TYPES = ["Custom", "Docling"] as const;

const TABLE_OPTIONS = ["drop", "keep", "convert"];

/* ---------- Types ---------- */

type MethodSpec = Record<string, any>;

/* ---------- Templates ---------- */

const CUSTOM_TEMPLATE: MethodSpec = {
  type: "Custom Conversion",
  do_ocr: false,
  image_starting_mark: "[IMAGE_START]",
  image_ending_mark: "[IMAGE_END]",
  prompt: "Describe the main object and its text captions in detail.",
};

const DOCLING_TEMPLATE: MethodSpec = {
  type: "Docling Conversion",
  do_ocr: false,
  do_tables: false,
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

/* ---------- Component ---------- */

export function ConversionEditor({
  method,
  onChange,
}: {
  method: MethodSpec[]; // pipeline array (max length 1)
  onChange: (next: MethodSpec[]) => void;
}) {
  const pipeline = method;

  const [selectedType, setSelectedType] = useState<(typeof METHOD_TYPES)[number]>("Custom");

  /* ---------------- Helpers ---------------- */

  function addMethod() {
    const template = structuredClone(templateFor(selectedType));
    onChange([{ ...template, type: selectedType }]);
  }

  function updateMethod(key: string, value: any) {
    if (pipeline.length === 0) return;
    const updated = { ...pipeline[0], [key]: value };
    onChange([updated]);
  }

  function deleteMethod() {
    onChange([]);
  }

  /* ---------------- Field renderer ---------------- */

  function renderValueEditor(key: string, value: any) {
    if (key === "type") {
      return <span>{String(value)}</span>;
    }

    if (typeof value === "boolean") {
      return (
        <select
          value={String(value)}
          onChange={(e) => updateMethod(key, e.target.value === "true")}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (key === "tables") {
      return (
        <select value={value} onChange={(e) => updateMethod(key, e.target.value)}>
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
        onChange={(e) => updateMethod(key, e.target.value)}
        style={{ width: "100%" }}
      />
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <section className="h-full flex flex-col gap-3">
      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-3">

        <div className="flex items-center gap-2">
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as any)}>
            {METHOD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <Button type="button" onClick={addMethod} size="sm">
            {pipeline.length === 0 ? "Add method" : "Replace method"}
          </Button>
        </div>
      </div>

      {/* Methods container */}

      <MethodsContainerCard
        title="Pipeline"
        methods={pipeline}
        renderMethod={(method, index) => (
          <FlexibleMethodCard
            method={method}
            onDelete={() => deleteMethod()}
            renderValue={(key, value) => renderValueEditor(key, value)}
            onColorChange={(next) => updateMethod("color", next)}
            defaultOpen={false}
          />
        )}
      />
    </section>
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
  // keep the editable pipeline in state (array of 0..1 methods)
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
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <SaveRunActions
            addFunction={addConversionPipeline}
            runFunction={runConversion}
            doc_id={doc_id}
            pipelineJson={pipelineJson}
            runLabel="Conversion"
          />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <ConversionEditor method={pipeline} onChange={setPipeline} />
        </div>
      </div>
    </div>
  );
}
