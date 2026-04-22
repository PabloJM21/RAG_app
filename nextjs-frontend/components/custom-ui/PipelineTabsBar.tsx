"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type Props = {
  projectIds: number[];
  currentProjectId: string;
  addProject: () => void;
  deleteProject: (id: string) => void;
  className?: string;
};

export function ProjectTabsBar({
  projectIds,
  currentProjectId,
  addProject,
  deleteProject,
  className,
}: Props) {
  const projectKeys = React.useMemo(
    () => [...projectIds].sort((a, b) => a - b).map(String),
    [projectIds]
  );

  return (
    <div
      className={cn(
        "border-b border-border p-2 flex items-center gap-2",
        className
      )}
    >
      <Tabs value={currentProjectId}>
        <TabsList className="h-10 px-1 overflow-x-auto whitespace-nowrap">
          {projectKeys.map((id) => (
            <div key={id} className="relative inline-flex items-center">
              <TabsTrigger value={id} asChild className="pr-9">
                <Link href={`/home/rag/${id}`}>
                  <span className="mr-2">{id}</span>
                </Link>
              </TabsTrigger>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "absolute right-1 top-1/2 -translate-y-1/2",
                      "h-6 w-6 rounded-sm",
                      "text-muted-foreground hover:text-foreground",
                      "hover:bg-background/60"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
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
                      deleteProject(id);
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          <TabsTrigger value="evaluator" asChild>
            <Link href="/home/rag/evaluator">Evaluator</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <button
        type="button"
        onClick={addProject}
        className="h-9 px-3 rounded-md border border-border hover:bg-muted"
      >
        + Add Project
      </button>
    </div>
  );
}