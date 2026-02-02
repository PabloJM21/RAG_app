"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ChevronRight, ChevronDown, X } from "lucide-react";
import { ColorPicker } from "@/components/custom-ui/ColorPicker"; // adjust path

type MethodSpec = Record<string, any>;

export function FlexibleMethodCard({
  method,
  titleKey = "type",
  defaultOpen = false,
  onDelete,
  renderValue,
  onColorChange,
  className,
}: {
  method: MethodSpec;
  titleKey?: string; // usually "type"
  defaultOpen?: boolean;
  onDelete: () => void;
  renderValue: (key: string, value: any) => React.ReactNode;

  // new: let parent update method.color (since SlotEditor owns state)
  onColorChange: (nextColor: string) => void;

  className?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  const titleValue =
    typeof method?.[titleKey] === "string"
      ? method[titleKey]
      : String(method?.[titleKey] ?? "—");

  const cardColor =
    typeof method?.color === "string" && method.color.length > 0
      ? method.color
      : "#ffffff";

  const entries = React.useMemo(
    () =>
      Object.entries(method ?? {}).filter(
        ([k]) => k !== titleKey && k !== "color" // hide color from table
      ),
    [method, titleKey]
  );

  return (
    <Card
      className={className}
      style={{
        backgroundColor: cardColor,
      }}
    >
      <CardHeader className="p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2"
            aria-expanded={open}
          >
            {open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}

            <span className="text-sm">
              <span className="font-semibold">{titleKey}</span>: {titleValue}
            </span>
          </button>

          {/* Color cube (no "color" row in table) */}
          <div className="ml-auto flex items-center gap-2">
            <ColorPicker
              color={cardColor}
              onChange={onColorChange}
            />

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

      {open && (
        <CardContent className="p-3 pt-0">
          <Table>
            <TableBody>
              {entries.map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="w-[45%] font-medium text-muted-foreground">
                    {key}
                  </TableCell>
                  <TableCell className="w-[55%]">
                    {renderValue(key, value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
