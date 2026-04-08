"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { addColors } from "@/app/api/rag/settings/colors-action";
import { addThemes } from "@/app/api/rag/settings/themes-action";

import { SaveActions } from "@/components/custom-ui/SaveRunActions";
import { ColorPicker } from "@/components/custom-ui/ColorPicker";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { THEME_PRESETS, ThemeName } from "@/components/frontend_data/themes";

type MethodColors = Record<string, string>;
type ColorsConfig = Record<string, MethodColors>;
type MethodSpec = Record<string, any>;

const DEFAULT_COLOR = "#ffffff";

const DEFAULT_COLORS: ColorsConfig = {
  Chunking: {
    "Paragraph Chunker": DEFAULT_COLOR,
    "Hybrid Chunker": DEFAULT_COLOR,
    "Sliding Window Chunker": DEFAULT_COLOR,
  },
  Enriching: {
    Extractor: DEFAULT_COLOR,
    Enricher: DEFAULT_COLOR,
    Filter: DEFAULT_COLOR,
    Reset: DEFAULT_COLOR,
  },
  Retrieval: {
    EmbeddingRetriever: DEFAULT_COLOR,
    ReasonerRetriever: DEFAULT_COLOR,
    BM25Retriever: DEFAULT_COLOR,
  },
};

function normalizeColors(input?: MethodSpec): ColorsConfig {
  return {
    Chunking: {
      ...DEFAULT_COLORS.Chunking,
      ...(input?.Chunking ?? {}),
    },
    Enriching: {
      ...DEFAULT_COLORS.Enriching,
      ...(input?.Enriching ?? {}),
    },
    Retrieval: {
      ...DEFAULT_COLORS.Retrieval,
      ...(input?.Retrieval ?? {}),
    },
  };
}

function ColorSection({
  title,
  description,
  methods,
  onChange,
}: {
  title: string;
  description: string;
  methods: MethodColors;
  onChange: (methodName: string, color: string) => void;
}) {
  const entries = Object.entries(methods);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[240px]">Method</TableHead>
              <TableHead className="w-[140px]">Spectrum</TableHead>
              <TableHead className="w-[140px]">Soft palette</TableHead>
              <TableHead className="w-[120px]">Current</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {entries.map(([methodName, color]) => (
              <TableRow key={methodName} className="hover:bg-muted/30">
                <TableCell className="py-3 font-medium">{methodName}</TableCell>

                <TableCell className="py-3">
                  <ColorPicker
                    color={color || DEFAULT_COLOR}
                    variant="spectrum"
                    onChange={(next) => onChange(methodName, next)}
                  />
                </TableCell>

                <TableCell className="py-3">
                  <ColorPicker
                    color={color || DEFAULT_COLOR}
                    variant="soft"
                    onChange={(next) => onChange(methodName, next)}
                  />
                </TableCell>

                <TableCell className="py-3">
                  <div
                    className="h-8 w-8 rounded-md border shadow-sm"
                    style={{ backgroundColor: color || DEFAULT_COLOR }}
                    aria-hidden="true"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export default function ColorsPageClient({
  pipeline: initialColors,
  initialTheme,
}: {
  pipeline: MethodSpec;
  initialTheme: ThemeName;
}) {
  const [pipeline, setPipeline] = useState<MethodSpec[]>([
    normalizeColors(initialColors),
  ]);
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(initialTheme);

  const currentColors = (pipeline[0] ?? DEFAULT_COLORS) as ColorsConfig;

  function updateCategoryColor(
    category: keyof ColorsConfig,
    methodName: string,
    color: string
  ) {
    setPipeline((prev) => {
      const current = normalizeColors(prev[0]);
      return [
        {
          ...current,
          [category]: {
            ...current[category],
            [methodName]: color,
          },
        },
      ];
    });
  }

  function resetDefaults() {
    setPipeline([structuredClone(DEFAULT_COLORS)]);
  }

  const pipelineJson = useMemo(
    () => JSON.stringify(pipeline[0] ?? null),
    [pipeline]
  );

  const themeJson = useMemo(
    () => JSON.stringify({ selectedTheme }),
    [selectedTheme]
  );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure the visual theme and display colors for your pipeline methods.
        </p>
      </header>

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Theme</h3>
          <p className="text-sm text-muted-foreground">
            Select the visual theme used across cards, containers, and page layout.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value as ThemeName)}
          >
            {Object.values(THEME_PRESETS).map((theme) => (
              <option key={theme.name} value={theme.name}>
                {theme.label}
              </option>
            ))}
          </select>

          <SaveActions
            addFunction={addThemes}
            pipelineJson={themeJson}
            saveLabel="Theme"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Method colors</h3>
            <p className="text-sm text-muted-foreground">
              Assign display colors to your chunking, enriching, and retrieval methods.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={resetDefaults}>
              Reset defaults
            </Button>

            <SaveActions
              addFunction={addColors}
              pipelineJson={pipelineJson}
              saveLabel="Colors"
            />
          </div>
        </div>

        <ColorSection
          title="Chunking"
          description="Assign colors to chunking methods."
          methods={currentColors.Chunking}
          onChange={(methodName, color) =>
            updateCategoryColor("Chunking", methodName, color)
          }
        />

        <ColorSection
          title="Enriching"
          description="Assign colors to enriching methods."
          methods={currentColors.Enriching}
          onChange={(methodName, color) =>
            updateCategoryColor("Enriching", methodName, color)
          }
        />

        <ColorSection
          title="Retrieval"
          description="Assign colors to retrieval methods."
          methods={currentColors.Retrieval}
          onChange={(methodName, color) =>
            updateCategoryColor("Retrieval", methodName, color)
          }
        />
      </section>
    </div>
  );
}