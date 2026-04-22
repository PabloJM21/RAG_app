"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";

import * as React from "react";
import { useFormStatus } from "react-dom";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Textarea} from "@/components/ui/textarea";
import {ScrollArea} from "@/components/ui/scroll-area";

import {exportProject, listExportedProjects, ListProject, loadProject} from "@/app/api/rag/projects/projects-action";

export function MenuSubmitButton({
  labelIdle,
  labelPending,
  keepOpen,
}: {
  labelIdle: string;
  labelPending: string;
  keepOpen: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        keepOpen();
      }}
      className="w-full text-left text-sm px-2 py-1.5 rounded-sm outline-none transition-colors
                 focus:bg-accent focus:text-accent-foreground
                 hover:bg-accent hover:text-accent-foreground
                 disabled:opacity-50 disabled:pointer-events-none"
    >
      {pending ? labelPending : labelIdle}
    </button>
  );
}




export function RunExportActions({
  project_id,
  runConversion,
  runChunking,
  runRetrieval,
}: {
  project_id: string;
  runConversion: (project_id: string) => Promise<any>;
  runChunking: (project_id: string) => Promise<any>;
  runRetrieval: (project_id: string) => Promise<any>;
}) {
  const [open, setOpen] = React.useState(false);
  const [runError, setRunError] = React.useState<string | null>(null);
  
  const [exportOpen, setExportOpen] = React.useState(false);
  const [loadOpen, setLoadOpen] = React.useState(false);
  
  const [projectName, setProjectName] = React.useState("");
  const [projects, setProjects] = React.useState<ListProject[]>([]);
  const [listPending, setListPending] = React.useState(false);

  
  
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
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => e.stopPropagation()}
          >
            Global Actions
          </Button>
        </DropdownMenuTrigger>
  
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="min-w-[220px]"
        >
          <DropdownMenuItem asChild>
            <form
              action={async () => {
                setOpen(true);
                setRunError(null);
  
                const res = await runConversion(project_id);
  
                if (res?.ok === false) {
                  setRunError(res.error ?? "Conversion failed");
                  setOpen(true);
                  return;
                }
  
                setOpen(false);
              }}
              className="w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <MenuSubmitButton
                labelIdle="Convert All"
                labelPending="Running…"
                keepOpen={() => setOpen(true)}
              />
            </form>
          </DropdownMenuItem>
  
          <DropdownMenuItem asChild>
            <form
              action={async () => {
                setOpen(true);
                setRunError(null);
  
                const res = await runChunking(project_id);
  
                if (res?.ok === false) {
                  setRunError(res.error ?? "Chunking failed");
                  setOpen(true);
                  return;
                }
  
                setOpen(false);
              }}
              className="w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <MenuSubmitButton
                labelIdle="Chunk All"
                labelPending="Running…"
                keepOpen={() => setOpen(true)}
              />
            </form>
          </DropdownMenuItem>
  
          <DropdownMenuItem asChild>
            <form
              action={async () => {
                setOpen(true);
                setRunError(null);
  
                const res = await runRetrieval(project_id);
  
                if (res?.ok === false) {
                  setRunError(res.error ?? "Staging failed");
                  setOpen(true);
                  return;
                }
  
                setOpen(false);
              }}
              className="w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <MenuSubmitButton
                labelIdle="Stage All"
                labelPending="Running…"
                keepOpen={() => setOpen(true)}
              />
            </form>
          </DropdownMenuItem>
          
          <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                setExportOpen(true);
              }}
            >
              Save project…
          </DropdownMenuItem>
  
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
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
          if (!open) setProjectName("");
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
              setProjectName("");
            }}
            className="space-y-3"
          >
            <input type="hidden" name="project_id" value={project_id} />
  
            <div className="grid gap-2">
              <label className="text-sm font-medium">Project name</label>
  
              <Textarea
                name="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
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
              <Button type="submit" disabled={!projectName.trim()}>
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
              Select a project to load into <span className="font-medium">{doc_name}</span>.
            </div>
  
            <ScrollArea className="h-[320px] rounded-md border">
              <div className="p-2 space-y-1">
                {listPending && (
                  <div className="p-2 text-sm text-muted-foreground">Loading…</div>
                )}
  
                {!listPending && projects.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">
                    No projects available.
                  </div>
                )}
  
                {projects.map((p) => (
                  <form
                    key={p.project_id}
                    action={async (fd: FormData) => {
                      await loadProject(fd);
                      setLoadOpen(false);
                    }}
                  >
                    <input type="hidden" name="target_id" value={project_id} />
                    <input type="hidden" name="source_id" value={p.project_id} />
  
                    <button
                      type="submit"
                      className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition"
                    >
                      {p.projectName}
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
    </>
  );
}

export function SaveRunActions({
  project_id,
  addFunction,
  runFunction,
  doc_id,
  projectJson,
  runLabel,
}: {
  project_id: string;
  addFunction: (formData: FormData) => Promise<any>;
  runFunction: (formData: FormData) => Promise<any>;
  doc_id: string;
  projectJson: string;
  runLabel: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [runError, setRunError] = React.useState<string | null>(null);

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
            <input type="hidden" name="project_id" value={project_id} />
            <input type="hidden" name="doc_id" value={doc_id} />
            <input type="hidden" name="project" value={projectJson} />

            <MenuSubmitButton
              labelIdle="Save Project"
              labelPending="Saving Project…"
              keepOpen={() => setOpen(true)}
            />
          </form>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <form
            action={async (formData: FormData) => {
              setOpen(true);
              setRunError(null);

              const res = await runFunction(formData);

              if (res?.ok === false) {
                setRunError(res.error ?? "Something went wrong");
                setOpen(true);
                return;
              }

              setOpen(false);
            }}
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <input type="hidden" name="project_id" value={project_id} />
            <input type="hidden" name="doc_id" value={doc_id} />

            <MenuSubmitButton
              labelIdle={`Run ${runLabel}`}
              labelPending={`Running ${runLabel}…`}
              keepOpen={() => setOpen(true)}
            />
          </form>
        </DropdownMenuItem>

        {runError && (
          <div className="px-2 py-1 text-sm text-red-600">{runError}</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SaveActions({
  project_id,
  addFunction,
  projectJson,
  saveLabel,
}: {
  project_id: string;
  addFunction: (formData: FormData) => Promise<any>;
  projectJson: string;
  saveLabel: string;
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
            <input type="hidden" name="project_id" value={project_id} />
            <input type="hidden" name="project" value={projectJson} />

            <MenuSubmitButton
              labelIdle={`Save ${saveLabel}`}
              labelPending={`Saving ${saveLabel}…`}
              keepOpen={() => setOpen(true)}
            />
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SaveResultsActions({
  project_id,
  addFunction,
  doc_id,
  resultsJson,
  saveLabel,
  disabled,
}: {
  project_id: string;
  addFunction: (formData: FormData) => Promise<any>;
  doc_id: string;
  resultsJson: string;
  saveLabel: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-6 w-6 rounded-sm text-muted-foreground hover:text-foreground hover:bg-background/60 inline-flex items-center justify-center disabled:opacity-50"
          aria-label="Save options"
          onClick={(e) => e.stopPropagation()}
          disabled={disabled}
        >
          …
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[220px]">
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
            <input type="hidden" name="project_id" value={project_id} />
            <input type="hidden" name="doc_id" value={doc_id} />
            <input type="hidden" name="results" value={resultsJson} />

            <MenuSubmitButton
              labelIdle={`Save ${saveLabel}`}
              labelPending={`Saving ${saveLabel}…`}
              keepOpen={() => setOpen(true)}
            />
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}