"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { ColorPicker } from "@/components/custom-ui/ColorPicker"; // adjust path

type MethodSpec = Record<string, any>;

export function FlexibleMethodCard({
  method,
  titleKey = "type",
  defaultOpen = false, // kept for API compatibility, no longer used
  onDelete,
  renderValue,
  onColorChange,
  className,
}: {
  method: MethodSpec;
  titleKey?: string;
  defaultOpen?: boolean;
  onDelete: () => void;
  renderValue: (key: string, value: any) => React.ReactNode;
  onColorChange: (nextColor: string) => void;
  className?: string;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(defaultOpen);

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
        ([k]) => k !== titleKey && k !== "color"
      ),
    [method, titleKey]
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
            <div className="inline-flex items-center gap-2">
              <span className="text-sm">
                <span className="font-semibold">{titleKey}</span>: {titleValue}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ColorPicker color={cardColor} onChange={onColorChange} />

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

        {/* Optional: small hint inside the card
        <CardContent className="px-3 pb-3 pt-0">
          <p className="text-xs text-muted-foreground">
            Double-click to view details
          </p>
        </CardContent>*/}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              <span className="font-semibold">{titleKey}</span>: {titleValue}
            </DialogTitle>
          </DialogHeader>

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
        </DialogContent>
      </Dialog>
    </>
  );
}