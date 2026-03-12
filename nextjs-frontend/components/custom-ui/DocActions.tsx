"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {ListPipeline} from "@/app/api/rag/docs/docs-action";

import { useRouter } from "next/navigation";
import {MenuSubmitButton} from "@/components/custom-ui/SaveRunActions";



export function DocActionsMenu({
  doc_id,
  doc_name,
  removeDoc,
  exportDocPipeline,   // (formData: FormData) => Promise<unknown>
  listDocPipelines,    // () => Promise<ListPipeline[]>
  loadDocPipeline,     // (formData: FormData) => Promise<unknown>
}: {
  doc_id: string;
  doc_name: string;
  removeDoc: (formData: FormData) => Promise<unknown>;

  exportDocPipeline: (formData: FormData) => Promise<unknown>;
  listDocPipelines: (formData: FormData) => Promise<ListPipeline[]>;
  loadDocPipeline: (formData: FormData) => Promise<unknown>;
}) {

  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);



  const [exportOpen, setExportOpen] = React.useState(false);
  const [loadOpen, setLoadOpen] = React.useState(false);

  // Export: name "editor"
  const [pipelineName, setPipelineName] = React.useState("");

  // Load: list pipelines using server action (no args)
  const [pipelines, setPipelines] = React.useState<ListPipeline[]>([]);
  const [listPending, setListPending] = React.useState(false);

  const listFormAction = async (formData: FormData) => {
    setListPending(true);
    try {
      const data = await listDocPipelines(formData);
      setPipelines(data);
    } finally {
      setListPending(false);
    }
  };


  // Trigger listing when opening the load dialog

  const listFormRef = React.useRef<HTMLFormElement | null>(null);
  const listBtnRef = React.useRef<HTMLButtonElement | null>(null);

  return (
    <>
      {/* Right-side dropdown trigger */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${doc_name}`}>
            ⋮
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-52"
          onCloseAutoFocus={(e) => e.preventDefault()}  // <- key fix
        >

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();        // prevent Radix default close/focus behavior glitches
              setMenuOpen(false);        // close menu first
              setExportOpen(true);       // then open dialog
            }}
          >
            Export pipeline…
          </DropdownMenuItem>


          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              setLoadOpen(true);
            }}
          >
            Load pipeline…
          </DropdownMenuItem>


          <DropdownMenuSeparator />

          <DropdownMenuItem asChild className="text-destructive">
            <form
              action={async (formData: FormData) => {
                setMenuOpen(true);
                await removeDoc(formData);
                router.refresh();
                setMenuOpen(false);
              }}
              className="w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <input type="hidden" name="doc_id" value={doc_id} />

              <MenuSubmitButton
                labelIdle="Delete"
                labelPending="Deleting…"
                keepOpen={() => setMenuOpen(true)}
              />
            </form>
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>

      {/* EXPORT dialog */}
      <Dialog
        open={exportOpen}
        onOpenChange={(open) => {
          setExportOpen(open);
          if (!open) setPipelineName("");
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Export pipeline</DialogTitle>
          </DialogHeader>

          <form
            action={async (fd: FormData) => {
              await exportDocPipeline(fd);
              setExportOpen(false);
              setPipelineName("");
            }}
            className="space-y-3"
          >
            <input type="hidden" name="doc_id" value={doc_id} />

            <div className="grid gap-2">
              <label className="text-sm font-medium">Pipeline name</label>

              {/* “small text editor” for name only */}
              <Textarea
                name="pipelineName"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                placeholder="e.g. retrieval_v3"
                className="min-h-[90px] font-mono"
              />

              <p className="text-xs text-muted-foreground">
                Choose a name to save the current pipeline under.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setExportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!pipelineName.trim()}>
                Export
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* LOAD dialog */}


      <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
        <DialogContent
          className="sm:max-w-[520px]"
          onOpenAutoFocus={() => {
            listBtnRef.current?.click();
          }}
        >
          <DialogHeader>
            <DialogTitle>Load pipeline</DialogTitle>
          </DialogHeader>



          {/* hidden form to run listDocPipelines via useActionState */}
          <form ref={listFormRef} action={listFormAction} className="hidden">
            <button ref={listBtnRef} type="submit" />
          </form>


          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Select a pipeline to load into <span className="font-medium">{doc_name}</span>.
            </div>

            <ScrollArea className="h-[320px] rounded-md border">
              <div className="p-2 space-y-1">
                {listPending && (
                  <div className="p-2 text-sm text-muted-foreground">Loading…</div>
                )}

                {!listPending && pipelines.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">
                    No pipelines available.
                  </div>
                )}

                {pipelines.map((p) => (
                  <form
                    key={p.pipeline_id}
                    action={async (fd: FormData) => {
                      await loadDocPipeline(fd);
                      setLoadOpen(false);
                    }}
                  >
                    <input type="hidden" name="doc_id" value={doc_id} />
                    <input type="hidden" name="pipeline_id" value={p.pipeline_id} />

                    <button
                      type="submit"
                      className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition"
                    >
                      {p.pipelineName}
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
