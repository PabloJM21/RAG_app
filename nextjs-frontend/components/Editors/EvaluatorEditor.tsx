"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ENRICHER_MODELS = [
  "coder",
  "thinker",
  "classifier",
  "generator",
  "reasoner",
] as const;

type EvaluatorType = "Chunking" | "Enriching";
type MethodSpec = Record<string, any>;

const CHUNKING_TEMPLATE: MethodSpec = {
  type: "Chunking",
  model: "",
  prompt:
    "A score in the range 0-100 that evaluates the quality of the chunking process",
  target_level: "",
  history: false,
};

const ENRICHING_TEMPLATE: MethodSpec = {
  type: "Enriching",
  model: "",
  prompt:
    "A score in the range 0-100 that evaluates the quality of the chunking process",
  target_level: "",
  history: false,
};

function templateFor(type: EvaluatorType): MethodSpec {
  return structuredClone(type === "Chunking" ? CHUNKING_TEMPLATE : ENRICHING_TEMPLATE);
}

export function EvaluatorSettingsCard({
  methods,
  onChange,
  type,
  title = "Evaluator settings",
}: {
  methods: MethodSpec[]; // same as your other editors
  onChange: (next: MethodSpec[]) => void;
  type: EvaluatorType; // fixed
  title?: string;
}) {
  const current = methods[0];

  // Ensure exactly one method exists and matches the fixed type.
  React.useEffect(() => {
    const needsInit =
      !current || methods.length !== 1 || String(current.type) !== type;

    if (needsInit) {
      onChange([{ ...templateFor(type), type }]);
    }
    // intentionally only depend on `type`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Render immediately even before parent applies the onChange result.
  const safe = React.useMemo(() => {
    if (!current || String(current.type) !== type) {
      return { ...templateFor(type), type };
    }
    return current;
  }, [current, type]);

  const updateField = (key: string, value: any) => {
    onChange([{ ...safe, [key]: value }]);
  };

  return (
    <Card className="rounded-xl border bg-card text-card-foreground shadow">
      <CardHeader className="py-4 bg-muted/30 border-b">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Model */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Model
          </div>
          <select
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={safe.model ?? ""}
            onChange={(e) => updateField("model", e.target.value)}
          >
            <option value="">—</option>
            {ENRICHER_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Target level */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Target level
          </div>
          <input
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={safe.target_level ?? ""}
            onChange={(e) => updateField("target_level", e.target.value)}
            placeholder="e.g. level_1"
          />
        </div>

        {/* Prompt */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Prompt
          </div>
          <textarea
            className="min-h-[110px] w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-relaxed
                       focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            value={safe.prompt ?? ""}
            onChange={(e) => updateField("prompt", e.target.value)}
          />
        </div>

        {/* History */}
        <label className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
          <div>
            <div className="text-sm font-medium">History</div>
            <div className="text-xs text-muted-foreground">
              Include prior context when evaluating.
            </div>
          </div>

          <input
            type="checkbox"
            checked={!!safe.history}
            onChange={(e) => updateField("history", e.target.checked)}
            className="h-4 w-4"
          />
        </label>
      </CardContent>
    </Card>
  );
}
