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


function MenuSaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full text-left text-sm px-2 py-1.5 rounded-sm outline-none transition-colors
                 focus:bg-accent focus:text-accent-foreground
                 hover:bg-accent hover:text-accent-foreground
                 disabled:opacity-50 disabled:pointer-events-none"
    >
      {pending ? `Saving ${label}…` : `Save ${label}`}
    </button>
  );
}



function MenuRunButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full text-left text-sm px-2 py-1.5 rounded-sm outline-none transition-colors
                 focus:bg-accent focus:text-accent-foreground
                 hover:bg-accent hover:text-accent-foreground
                 disabled:opacity-50 disabled:pointer-events-none"
    >
      {pending ? `Running ${label}…` : `Run ${label}`}
    </button>
  );
}




function MainRunButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full text-left text-sm px-2 py-1.5 rounded-sm outline-none transition-colors
                 focus:bg-accent focus:text-accent-foreground
                 hover:bg-accent hover:text-accent-foreground
                 disabled:opacity-50 disabled:pointer-events-none"
    >
      {pending ? `Running…` : `${label}`}
    </button>
  );
}







function MenuSubmitButton({
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
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem asChild>
          <form
            action={async () => {
              setOpen(true);
              await runConversion();
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
              await runChunking();
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
              await runRetrieval();
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
        // prevent Radix from closing on outside focus while pending transitions happen
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Save */}
        <DropdownMenuItem asChild>
          <form
            action={async (formData: FormData) => {
              setOpen(true); // ensure open immediately
              await addFunction(formData);
              setOpen(false); // close when done
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

        {/* Run */}
        <DropdownMenuItem asChild>
          <form
            action={async (formData: FormData) => {
              setOpen(true);
              await runFunction(formData);
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
  return (
    <DropdownMenu>
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
              await addFunction(formData);
            }}
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <input type="hidden" name="doc_id" value={doc_id} />
            <input type="hidden" name="results" value={resultsJson} />

            <MenuSaveButton label={saveLabel} />
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}