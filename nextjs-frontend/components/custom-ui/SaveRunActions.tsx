"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/custom-ui/SaveButton";
import { RunButton } from "@/components/custom-ui/RunButton";

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Actions
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[220px]">
        {/* Save */}
        <DropdownMenuItem asChild>
          <form
            action={addFunction}
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <input type="hidden" name="doc_id" value={doc_id} />
            <input type="hidden" name="pipeline" value={pipelineJson} />

            <div className="w-full [&>button]:w-full">
              <SaveButton label="Pipeline" />
            </div>
          </form>
        </DropdownMenuItem>

        {/* Run */}
        <DropdownMenuItem asChild>
          <form
            action={runFunction}
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <input type="hidden" name="doc_id" value={doc_id} />

            <div className="w-full [&>button]:w-full">
              <RunButton label={runLabel} />
            </div>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}




export function SaveActions({
  addFunction,
  doc_id,
  pipelineJson,
}: {
  addFunction: (formData: FormData) => Promise<any>;
  doc_id: string;
  pipelineJson: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Save
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuItem asChild>
          <form
            action={addFunction}
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <input type="hidden" name="doc_id" value={doc_id} />
            <input type="hidden" name="pipeline" value={pipelineJson} />

            <div className="w-full [&>button]:w-full">
              <SaveButton label="Pipeline" />
            </div>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}