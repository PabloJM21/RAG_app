// MethodsContainerCard.tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MethodsContainerCardProps<T> = {
  title?: React.ReactNode;
  methods: T[];
  emptyText?: React.ReactNode;
  renderMethod: (method: T, index: number) => React.ReactNode;

  className?: string;
  headerClassName?: string;
  contentClassName?: string;

  /** Accent color for the ring; Tailwind class string */
  accentClassName?: string; // e.g. "ring-blue-500/30" or leave default
};

export function MethodsContainerCard<T>({
  title = "Pipeline",
  methods,
  emptyText = "No methods yet — add one above.",
  renderMethod,
  className,
  headerClassName,
  contentClassName,
  accentClassName,
}: MethodsContainerCardProps<T>) {
  return (
    <Card
      className={cn(
        "relative w-full max-w-full min-h-0 rounded-xl",
        "shadow-sm",
        "border border-blue-500/25",
        accentClassName ?? "ring-1 ring-blue-500/25",
        "overflow-hidden",
        className,
      )}
    >

      {/* Inner ring + texture + vignette */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 rounded-xl",
          // inner ring
          "outline outline-1 outline-blue-500/20 outline-offset-[-6px]",

          // subtle “paper/frost” texture via layered gradients
          // 1) soft diagonal grain
          // 2) gentle top highlight
          // 3) faint bottom vignette
          // (using arbitrary values so no extra CSS file needed)
          "[background-image:linear-gradient(135deg,rgba(59,130,246,0.07)_0%,rgba(59,130,246,0)_35%,rgba(59,130,246,0.06)_70%,rgba(59,130,246,0)_100%),radial-gradient(1200px_260px_at_20%_0%,rgba(255,255,255,0.40),rgba(255,255,255,0)_60%),radial-gradient(800px_260px_at_80%_100%,rgba(0,0,0,0.08),rgba(0,0,0,0)_55%)]",
          "dark:[background-image:linear-gradient(135deg,rgba(59,130,246,0.10)_0%,rgba(59,130,246,0)_35%,rgba(59,130,246,0.08)_70%,rgba(59,130,246,0)_100%),radial-gradient(1200px_260px_at_20%_0%,rgba(255,255,255,0.10),rgba(255,255,255,0)_60%),radial-gradient(800px_260px_at_80%_100%,rgba(0,0,0,0.25),rgba(0,0,0,0)_55%)]",
        )}
      />

      {/* Tiny sparkle line near top edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-3 right-3 top-2 h-px bg-gradient-to-r from-transparent via-blue-500/25 to-transparent"
      />

      <CardHeader className={cn("py-3 relative", headerClassName)}>
        {/* Header sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-50
                     [background-image:radial-gradient(600px_120px_at_20%_0%,rgba(59,130,246,0.18),rgba(59,130,246,0)_70%)]"
        />
        <CardTitle className="relative text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className={cn("pt-0 h-full min-h-0 relative", contentClassName)}>
        {/* Horizontal scroll area for the method cards */}
        <div className="h-full min-h-0 overflow-x-auto overflow-y-hidden pb-2">
          <div className="flex gap-4 min-w-max">
            {methods.map((method, index) => (
              <div key={index} style={{ marginTop: 12 }}>
                {renderMethod(method, index)}
              </div>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {methods.length === 0 && (
          <div className="text-sm text-muted-foreground mt-2">{emptyText}</div>
        )}
      </CardContent>
    </Card>
  );
}
