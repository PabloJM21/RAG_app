"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import {addEvaluator} from "@/api/rag/projects/projects-action";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {MenuSubmitButton} from "@/components/custom-ui/SaveRunActions";
import {
  EVALUATOR_QUERY_PROMPTS,
} from "@/components/frontend_data/Prompts";

import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";

type MethodSpec = Record<string, any>;

const DEFAULT_METHOD_COLOR = "#ffffff";

const Evaluator_MODELS = ["coder", "thinker", "classifier", "generator", "reasoner"];

const Evaluator_TEMPLATE: MethodSpec = {
  color: DEFAULT_METHOD_COLOR,
  query_transformation_model: "",
  query_transformation_prompt: "",
  reasoner_model: "",
};

function renderEvaluatorField({
  key,
  value,
  updateField,
}: {
  key: string;
  value: any;
  updateField: (key: string, value: any) => void;
}) {
  const themedInputStyle: React.CSSProperties = {
    background: "var(--theme-card-header-bg)", // ✅ changed here
    color: "var(--theme-doc-title)",           // content text (same as docs)
    borderColor: "var(--theme-input-border)",
  };

  if (key === "reasoner_model" || key === "query_transformation_model") {
    return (
      <select
        className="h-9 w-full rounded-md border px-2 text-sm"
        style={themedInputStyle}
        value={value ?? ""}
        onChange={(e) => updateField(key, e.target.value)}
      >
        <option value="">—</option>
        {Evaluator_MODELS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    );
  }



  if (key === "query_transformation_prompt") {
    return (
      <>
        <input
          className="h-9 w-full rounded-md border px-3 text-sm"
          style={themedInputStyle}
          list="evaluator-query-prompts"
          type="text"
          value={String(value ?? "")}
          onChange={(e) => updateField(key, e.target.value)}
        />
        <datalist id="evaluator-query-prompts">
          {EVALUATOR_QUERY_PROMPTS.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>
      </>
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

function EvaluatorSettingsCard({
  method,
  onChange,
}: {
  method: MethodSpec[]; // evaluator array (max length 1)
  onChange: (next: MethodSpec[]) => void;
}) {
  const currentMethod = method[0];

  const hasMethod = method.length > 0;

  function addMethod() {
    onChange([structuredClone(Evaluator_TEMPLATE)]);
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
    "reasoner_model",
  ] as const;

  const themedCardStyle: React.CSSProperties = {
    background: "var(--theme-card-bg)",
    color: "var(--theme-card-fg)",
    borderColor: "var(--theme-card-border)",
    boxShadow: "var(--theme-card-shadow)",
    position: "relative",
    overflow: "hidden",
  };

  const themedCardInnerOverlayStyle: React.CSSProperties = {
    pointerEvents: "none",
    position: "absolute",
    inset: 0,
    borderRadius: "inherit",
    outline: "1px solid var(--theme-accent-outline)",
    outlineOffset: "-1px",
    backgroundImage: [
      "linear-gradient(135deg, color-mix(in srgb, var(--theme-accent-ring) 24%, transparent) 0%, transparent 30%, color-mix(in srgb, var(--theme-accent-ring) 18%, transparent) 68%, transparent 100%)",
      "radial-gradient(1200px 260px at 20% 0%, color-mix(in srgb, white 22%, transparent), transparent 60%)",
      "radial-gradient(900px 280px at 80% 100%, color-mix(in srgb, black 16%, transparent), transparent 58%)",
      "radial-gradient(900px 400px at 50% -10%, color-mix(in srgb, var(--theme-accent-glow) 30%, transparent), transparent 70%)",
    ].join(", "),
  };

  const themedHeaderStyle: React.CSSProperties = {
    position: "relative",
    background: "var(--theme-card-header-bg)",
    borderBottomColor: "var(--theme-card-header-border)",
  };

  const themedTopLineStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundImage:
      "linear-gradient(to right, transparent, var(--theme-accent-top-line), transparent)",
    boxShadow: "0 0 12px var(--theme-accent-glow)",
  };

  const themedHeaderGlowStyle: React.CSSProperties = {
    pointerEvents: "none",
    position: "absolute",
    inset: 0,
    backgroundImage:
      "radial-gradient(700px 140px at 20% 0%, color-mix(in srgb, var(--theme-accent-header-glow) 95%, transparent), transparent 72%)",
  };

  const themedTitleStyle: React.CSSProperties = {
    color: "var(--theme-card-title)",
  };

  const themedMutedStyle: React.CSSProperties = {
    color: "var(--theme-card-muted)",
  };

  return (
    <Card
      className="rounded-xl border shadow"
      style={themedCardStyle}
    >
      <div style={themedCardInnerOverlayStyle} />

      <CardHeader
        className="py-4 border-b"
        style={themedHeaderStyle}
      >
        <div style={themedTopLineStyle} />
        <div style={themedHeaderGlowStyle} />

        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle
              className="text-sm font-medium"
              style={themedTitleStyle}
            >
              Evaluator
            </CardTitle>
            <div
              className="mt-1 text-xs"
              style={themedMutedStyle}
            >
              Generate the final output.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={addMethod}>
              {hasMethod ? "Replace evaluator" : "Add evaluator"}
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

      <CardContent
        className="relative z-10 p-4 space-y-4"
        style={{
          ...themedTitleStyle,
          background: "var(--theme-card-header-bg)",
        }}
      >
        {hasMethod && currentMethod ? (
          <>
            {fields.map((key) => (
              <div key={key} className="space-y-1">
                <div
                  className="text-xs font-medium uppercase tracking-wide"
                  style={themedMutedStyle}
                >
                  {key.replaceAll("_", " ")}
                </div>
                {renderEvaluatorField({
                  key,
                  value: currentMethod[key],
                  updateField: updateMethod,
                })}
              </div>
            ))}
          </>
        ) : (
          <div
            className="text-sm"
            style={themedMutedStyle}
          >
            No evaluator yet — add one above.
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export function SaveEvaluatorAction({
  addFunction,
  evaluatorJson,
}: {
  addFunction: (formData: FormData) => Promise<any>;
  evaluatorJson: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-6 w-6 rounded-sm text-muted-foreground hover:text-foreground hover:bg-background/60 inline-flex items-center justify-center"
          aria-label="Global Options"
          onClick={(e) => e.stopPropagation()}
        >
          …
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="min-w-[220px]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem asChild>
          <form
            action={async (formData: FormData) => {
              setOpen(true);
              await addFunction(formData);
              setOpen(false);
            }}
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          >

            <input type="hidden" name="evaluator" value={evaluatorJson} />

            <MenuSubmitButton
              labelIdle={`Save evaluator`}
              labelPending={`Saving evaluator…`}
              keepOpen={() => setOpen(true)}
            />
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function EvaluatorPageClient({
  evaluator: initialEvaluator,
}: {
  evaluator: MethodSpec;
}) {
  // keep the editable evaluator in state (array of 0..1 methods)
  const [evaluator, setEvaluator] = useState<MethodSpec[]>(
    initialEvaluator ? [initialEvaluator] : []
  );

  const evaluatorJson = useMemo(
    () => JSON.stringify(evaluator[0] ?? {}),
    [evaluator]
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

            <SaveEvaluatorAction
              addFunction={addEvaluator}
              evaluatorJson={evaluatorJson}
            />
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <EvaluatorSettingsCard
            method={evaluator}
            onChange={setEvaluator}
          />
        </div>
      </div>
    </div>
  );
}