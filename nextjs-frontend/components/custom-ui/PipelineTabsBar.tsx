"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/api/lib/utils";

import { Tabs, TabsList, TabsTrigger } from "@/../components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/../components/ui/dropdown-menu";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/../components/ui/dialog";
import {exportProject, listExportedProjects, ListProject, loadProject} from "@/api/rag/projects/projects-action";
import {Textarea} from "@/../components/ui/textarea";
import {Button} from "@/../components/ui/button";
import {ScrollArea} from "@/../components/ui/scroll-area";
import { useRouter } from "next/navigation";


type Project = {
  project_id: string;
  name: string;
};

type Props = {
  projects: Project[];
  currentProjectId: string;
  addProject: () => void;
  deleteProject: (project_id: string) => void;
  className?: string;
};

export function ProjectTabsBar({
  projects,
  currentProjectId,
  addProject,
  deleteProject,
  className,
}: Props) {

  const [exportOpen, setExportOpen] = React.useState(false);
  const [loadOpen, setLoadOpen] = React.useState(false);

  const [open, setOpen] = React.useState(false);
  const [runError, setRunError] = React.useState<string | null>(null);

  const [name, setname] = React.useState("");
  const [exported_projects, setProjects] = React.useState<ListProject[]>([]);
  const [listPending, setListPending] = React.useState(false);

  const router = useRouter();

  const listFormAction = async (formData: FormData) => {
    setListPending(true);
    try {
      const data = await listExportedProjects(formData);
      setProjects(data);
    } finally {
      setListPending(false);
    }
  };

  const listFormRef = React.useRef<HTMLFormElement | null>(null);
  const listBtnRef = React.useRef<HTMLButtonElement | null>(null);


  return (
    <div
      className={cn(
        "border-b border-border p-2 flex items-center gap-2",
        className
      )}
    >
      <Tabs value={currentProjectId}>
        <TabsList className="h-10 px-1 overflow-x-auto whitespace-nowrap">
          {projects.map((project) => (
            <div
              key={project.project_id}
              className="relative inline-flex items-center"
            >
              <TabsTrigger
                value={project.project_id}
                asChild
                className="pr-9"
              >
                <Link href={`/home/rag/${project.project_id}`}>
                  <span className="mr-2">{project.name}</span>
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
                    aria-label={`Options for ${project.name}`}
                  >
                    …
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-500 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.project_id);
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setOpen(false);
                        setExportOpen(true);
                      }}
                    >
                      Save project…
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setOpen(false);
                      setLoadOpen(true);
                    }}
                  >
                    Load project…
                  </DropdownMenuItem>

                  {runError && (
                    <div className="px-2 py-1 text-sm text-red-600">{runError}</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog
                open={exportOpen}
                onOpenChange={(open) => {
                  setExportOpen(open);
                  if (!open) setname("");
                }}
              >
                <DialogContent className="sm:max-w-[520px]">
                  <DialogHeader>
                    <DialogTitle>Save project</DialogTitle>
                  </DialogHeader>

                  <form
                    action={async (fd: FormData) => {
                      await exportProject(fd);
                      setExportOpen(false);
                      setname("");
                      router.refresh();
                    }}
                    className="space-y-3"
                  >
                    <input type="hidden" name="project_id" value={project.project_id} />

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Project name</label>

                      <Textarea
                        name="name"
                        value={name}
                        onChange={(e) => setname(e.target.value)}
                        placeholder="e.g. retrieval_v3"
                        className="min-h-[90px] font-mono"
                      />

                      <p className="text-xs text-muted-foreground">
                        Choose a name to save the current project under.
                      </p>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="secondary" onClick={() => setExportOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={!name.trim()}>
                        Save
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
                <DialogContent
                  className="sm:max-w-[520px]"
                  onOpenAutoFocus={() => {
                    listBtnRef.current?.click();
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Load project</DialogTitle>
                  </DialogHeader>

                  <form ref={listFormRef} action={listFormAction} className="hidden">
                    <button ref={listBtnRef} type="submit" />
                  </form>

                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Select a project to load.
                    </div>

                    <ScrollArea className="h-[320px] rounded-md border">
                      <div className="p-2 space-y-1">
                        {listPending && (
                          <div className="p-2 text-sm text-muted-foreground">Loading…</div>
                        )}

                        {!listPending && exported_projects.length === 0 && (
                          <div className="p-2 text-sm text-muted-foreground">
                            No projects available.
                          </div>
                        )}

                        {exported_projects.map((p) => (
                          <form
                            key={p.project_id}
                            action={async (fd: FormData) => {
                              await loadProject(fd);
                              setLoadOpen(false);
                              router.refresh();
                            }}
                          >
                            <input type="hidden" name="target_id" value={project.project_id} />
                            <input type="hidden" name="source_id" value={p.project_id} />

                            <button
                              type="submit"
                              className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition"
                            >
                              {p.name}
                            </button>
                          </form>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="flex justify-end">
                      <Button variant="secondary" onClick={() => setLoadOpen(false)}>
                        Close
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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