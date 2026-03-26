"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import {
  addGenerator,
  run,
} from "@/app/api/rag/main-pipeline/pipeline-action";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaveActions, ThreeRunActions } from "@/components/custom-ui/SaveRunActions";
import {
  GENERATOR_PROMPTS,
  GENERATOR_QUERY_PROMPTS,
} from "@/components/frontend_data/Prompts";
import { GENERATOR_MODELS } from "@/components/frontend_data/models";

type MethodSpec = Record<string, any>;

const DEFAULT_METHOD_COLOR = "#ffffff";

const GENERATOR_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  type: "Generator",
  query_transformation_model: "",
  query_transformation_prompt: "",
  generator_model: "",
  generator_prompt: "",
};

function renderGeneratorField({
  key,
  value,
  updateField,
}: {
  key: string;
  value: any;
  updateField: (key: string, value: any) => void;
}) {
  if (key === "generator_model" || key === "query_transformation_model") {
    return (
      <select
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        value={value ?? ""}
        onChange={(e) => updateField(key, e.target.value)}
      >
        <option value="">—</option>
        {GENERATOR_MODELS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    );
  }

  if (key === "generator_prompt") {
    return (
      <>
        <input
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          list="generator-prompts"
          type="text"
          value={String(value ?? "")}
          onChange={(e) => updateField(key, e.target.value)}
        />
        <datalist id="generator-prompts">
          {GENERATOR_PROMPTS.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>
      </>
    );
  }

  if (key === "query_transformation_prompt") {
    return (
      <>
        <input
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          list="generator-query-prompts"
          type="text"
          value={String(value ?? "")}
          onChange={(e) => updateField(key, e.target.value)}
        />
        <datalist id="generator-query-prompts">
          {GENERATOR_QUERY_PROMPTS.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>
      </>
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

function GeneratorSettingsCard({
  method,
  onChange,
}: {
  method: MethodSpec[]; // pipeline array (max length 1)
  onChange: (next: MethodSpec[]) => void;
}) {
  const currentMethod = method[0];

  const hasMethod =
    !!currentMethod &&
    typeof currentMethod.type === "string" &&
    currentMethod.type.length > 0;

  function addMethod() {
    onChange([structuredClone(GENERATOR_TEMPLATE)]);
  }

  function updateMethod(key: string, value: any) {
    if (!currentMethod) return;
    onChange([{ ...currentMethod, [key]: value }]);
  }

  function deleteMethod() {
    onChange([]);
  }

  const fields = [
    "query_transformation_model",
    "query_transformation_prompt",
    "generator_model",
    "generator_prompt",
  ] as const;

  return (
    <Card className="rounded-xl border bg-card text-card-foreground shadow">
      <CardHeader className="py-4 bg-muted/30 border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Generator
            </CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              Generate the final output.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={addMethod}>
              {hasMethod ? "Replace generator" : "Add generator"}
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
            {fields.map((key) => (
              <div key={key} className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {key.replaceAll("_", " ")}
                </div>
                {renderGeneratorField({
                  key,
                  value: currentMethod[key],
                  updateField: updateMethod,
                })}
              </div>
            ))}
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            No generator yet — add one above.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GeneratorPageClient({
  pipeline: initialGenerator,
}: {
  pipeline: MethodSpec;
}) {
  // keep the editable pipeline in state (array of 0..1 methods)
  const [pipeline, setPipeline] = useState<MethodSpec[]>(
    initialGenerator ? [initialGenerator] : []
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
          <div className="flex items-center gap-2">
            <ThreeRunActions
              runConversion={() => run("conversion")}
              runChunking={() => run("chunking")}
              runRetrieval={() => run("retrieval")}
            />

            <SaveActions
              addFunction={addGenerator}
              pipelineJson={pipelineJson}
              saveLabel="Generator"
            />
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <GeneratorSettingsCard
            method={pipeline}
            onChange={setPipeline}
          />
        </div>
      </div>
    </div>
  );
}