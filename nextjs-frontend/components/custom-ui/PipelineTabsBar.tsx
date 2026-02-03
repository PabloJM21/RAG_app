"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type MethodSpec = Record<string, any>;
export type PipelineSpec = Record<string, MethodSpec[]>;

type Props = {
  pipeline: PipelineSpec;
  pipelineId: string;
  setPipelineId: (id: string) => void;

  addPipeline: () => void;
  addEvaluator: () => void;
  deletePipeline: (id: string) => void;

  className?: string;
};

export function PipelineTabsBar({
  pipeline,
  pipelineId,
  setPipelineId,
  addPipeline,
  addEvaluator,
  deletePipeline,
  className,
}: Props) {
  const pipelineKeys = React.useMemo(() => Object.keys(pipeline), [pipeline]);

  return (
    <div
      className={cn(
        "border-t border-border p-2 flex items-center gap-2",
        className,
      )}
    >
      <Tabs value={pipelineId} onValueChange={setPipelineId}>
        <TabsList className="h-10 px-1 overflow-x-auto whitespace-nowrap">
          {pipelineKeys.map((id) => (
            <div key={id} className="relative inline-flex items-center">
              <TabsTrigger value={id} className="pr-9">
                <span className="mr-2">{id}</span>
              </TabsTrigger>

              {/* menu button on the right side of the "tab" */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "absolute right-1 top-1/2 -translate-y-1/2",
                      "h-6 w-6 rounded-sm",
                      "text-muted-foreground hover:text-foreground",
                      "hover:bg-background/60",
                    )}
                    onClick={(e) => {
                      // don't select the tab when opening the menu
                      e.stopPropagation();
                    }}
                    aria-label={`Options for ${id}`}
                  >
                    …
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-500 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePipeline(id);
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </TabsList>
      </Tabs>

      <button
        type="button"
        onClick={addPipeline}
        className="h-9 px-3 rounded-md border border-border hover:bg-muted"
      >
        + Add Pipeline
      </button>

      <button
        type="button"
        onClick={addEvaluator}
        disabled={!!pipeline.evaluator}
        className="h-9 px-3 rounded-md border border-border hover:bg-muted disabled:opacity-50"
      >
        + Add Evaluator
      </button>
    </div>
  );
}
