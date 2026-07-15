"use client";

import * as React from "react";
import { Button } from "@/../components/ui/button";
import { Card, CardHeader, CardContent } from "@/../components/ui/card";
import { Table, TableBody, TableRow, TableCell } from "@/../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/../components/ui/dialog";
import { X, ChevronDown, ChevronUp } from "lucide-react";

type MethodSpec = Record<string, any>;

/** Replace underscores with spaces for display. e.g. "input_level" → "input level" */
function formatKey(key: string): string {
  return key.replace(/_/g, " ");
}

/** Keys whose value cells should be collapsible (prompt and caption only). */
const COLLAPSIBLE_KEYS = new Set(["prompt", "caption"]);

/**
 * Collapsible cell for "prompt" and "caption" keys only.
 * Collapsed: single-line truncated preview + chevron.
 * Expanded: textarea + suggestion chips (datalist replacement).
 */
function CollapsibleInputCell({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = React.useState(false);

  const childArr = React.Children.toArray(children) as React.ReactElement<any>[];

  const inputEl: React.ReactElement<any> | undefined =
    childArr[0]?.type === "input"
      ? childArr[0]
      : (React.Children.toArray(childArr[0]?.props?.children ?? []) as React.ReactElement<any>[])
          .find((c) => c?.type === "input");

  const datalistEl: React.ReactElement<any> | undefined =
    (React.Children.toArray(childArr[0]?.props?.children ?? []) as React.ReactElement<any>[])
      .find((c) => c?.type === "datalist");

  const value = String(inputEl?.props?.value ?? "");
  const onChange = inputEl?.props?.onChange;

  const suggestions: string[] = datalistEl
    ? (React.Children.toArray(datalistEl.props?.children ?? []) as React.ReactElement<any>[])
        .map((opt) => String(opt?.props?.value ?? ""))
        .filter(Boolean)
    : [];

  if (!expanded) {
    return (
      <div
        className="flex items-center gap-1 cursor-pointer group"
        onClick={() => setExpanded(true)}
      >
        <span
          className={`flex-1 text-sm truncate ${
            value ? "text-foreground" : "italic text-muted-foreground"
          }`}
          title={value || "—"}
        >
          {value || "—"}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring"
        rows={4}
        value={value}
        onChange={onChange}
      />

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Suggestions:</span>
          <div className="flex flex-col gap-0.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="text-left text-xs px-2 py-1 rounded bg-muted hover:bg-muted/70 text-foreground"
                title={s}
                onClick={() =>
                  onChange?.({ target: { value: s } } as React.ChangeEvent<HTMLInputElement>)
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="self-start flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded(false)}
      >
        <ChevronUp className="h-3 w-3" />
        <span>Collapse</span>
      </button>
    </div>
  );
}

export function FlexibleMethodCard({
  method,
  color = "#ffffff",
  titleKey = "type",
  defaultOpen = false,
  onDelete,
  renderValue,
  highlightKeys = [],
  className,
}: {
  method: MethodSpec;
  color?: string;
  titleKey?: string;
  defaultOpen?: boolean;
  onDelete: () => void;
  renderValue: (key: string, value: any) => React.ReactNode;
  highlightKeys?: string[];
  className?: string;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(defaultOpen);

  const titleValue =
    typeof method?.[titleKey] === "string"
      ? method[titleKey]
      : String(method?.[titleKey] ?? "—");

  const cardColor =
    typeof color === "string" && color.length > 0 ? color : "#ffffff";

  const highlightedEntries = React.useMemo(
    () =>
      highlightKeys
        .filter((key) => key in (method ?? {}) && key !== titleKey && key !== "color")
        .map((key) => [key, method[key]] as [string, any]),
    [highlightKeys, method, titleKey]
  );

  const entries = React.useMemo(
    () =>
      Object.entries(method ?? {}).filter(
        ([k]) => k !== titleKey && k !== "color" && !highlightKeys.includes(k)
      ),
    [method, titleKey, highlightKeys]
  );

  return (
    <>
      <Card
        className={className}
        style={{ backgroundColor: cardColor }}
        onDoubleClick={() => setDialogOpen(true)}
      >
        <CardHeader className="p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{titleValue}</span>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={onDelete}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {highlightedEntries.length > 0 && (
          <CardContent className="px-3 pb-3 pt-0">
            <div className="space-y-1 text-sm">
              {highlightedEntries.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground min-w-[120px]">
                    {formatKey(key)}:
                  </span>
                  <div className="flex-1">{renderValue(key, value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{titleValue}</DialogTitle>
          </DialogHeader>

          <Table>
            <TableBody>
              {entries.map(([key, value]) => {
                const rendered = renderValue(key, value);
                const useCollapsible = COLLAPSIBLE_KEYS.has(key);
                return (
                  <TableRow key={key}>
                    <TableCell className="w-[45%] font-medium text-muted-foreground align-top pt-3">
                      {formatKey(key)}
                    </TableCell>
                    <TableCell className="w-[55%]">
                      {useCollapsible ? (
                        <CollapsibleInputCell>{rendered}</CollapsibleInputCell>
                      ) : (
                        rendered
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}
