"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {Button} from "@/components/ui/button"
import { useRouter } from "next/navigation";

import * as React from "react";
import { useFormStatus } from "react-dom";




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
        // keep menu open immediately
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




export function ThreeRunActions({
  runConversion,
  runChunking,
  runRetrieval,
}: {
  runConversion: () => Promise<any>;
  runChunking: () => Promise<any>;
  runRetrieval: () => Promise<any>;
}) {
  const [open, setOpen] = React.useState(false);
  const [runError, setRunError] = React.useState<string | null>(null);

  return (
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
        {/* Convert */}
        <DropdownMenuItem asChild>
          <form
            action={async () => {
              setOpen(true);
              setRunError(null);

              const res = await runConversion();

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

        {/* Chunk */}
        <DropdownMenuItem asChild>
          <form
            action={async () => {
              setOpen(true);
              setRunError(null);

              const res = await runChunking();

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

        {/* Retrieval */}
        <DropdownMenuItem asChild>
          <form
            action={async () => {
              setOpen(true);
              setRunError(null);

              const res = await runRetrieval();

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

        {/* 🔴 Error display */}
        {runError && (
          <div className="px-2 py-1 text-sm text-red-600">
            {runError}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}




export function SaveRunActions({
  addFunction,
  runFunction,
  doc_id,
  pipelineJson,
  runLabel,
}: {
  addFunction: (formData: FormData) => Promise<any>;
  runFunction: (formData: FormData) => Promise<any>;
  doc_id: string;
  pipelineJson: string;
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
            <input type="hidden" name="doc_id" value={doc_id} />
            <input type="hidden" name="pipeline" value={pipelineJson} />

            <MenuSubmitButton
              labelIdle="Save Pipeline"
              labelPending="Saving Pipeline…"
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
            <input type="hidden" name="doc_id" value={doc_id} />

            <MenuSubmitButton
              labelIdle={`Run ${runLabel}`}
              labelPending={`Running ${runLabel}…`}
              keepOpen={() => setOpen(true)}
            />
          </form>
        </DropdownMenuItem>

        {runError && (
          <div className="px-2 py-1 text-sm text-red-600">
            {runError}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}




export function SaveActions({
  addFunction,
  pipelineJson,
  saveLabel,
}: {
  addFunction: (formData: FormData) => Promise<any>;
  pipelineJson: string;
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
            <input type="hidden" name="pipeline" value={pipelineJson} />

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
  addFunction,
  doc_id,
  resultsJson,
  saveLabel,
  disabled,
}: {
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