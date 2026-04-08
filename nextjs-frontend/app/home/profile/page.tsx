import Link from "next/link";
import {Button} from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {fetchKeys} from "@/app/api/rag/profile/keys-action";
import {RequestUrlButton} from "./requestUrl";
import {DeleteKeyButton, DeletePipelineButton} from "./deleteButton";
import {listDocPipelines} from "@/app/api/rag/docs/docs-action";

export default async function KeyEditorPage() {
  const keys = await fetchKeys();
  const pipelines = await listDocPipelines();

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      {/* Page header */}
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Manage provider API keys and connection settings.
        </p>
      </header>

      {/* API Keys */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">API Keys</h3>
            <p className="text-sm text-muted-foreground">
              Stored keys are used by your pipelines. Keep them private.
            </p>
          </div>

          <Link href="/home/profile/add-key">
            <Button variant="outline" size="sm">
              Add key
            </Button>
          </Link>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[220px]">Base API</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!keys.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center">
                    <div className="text-sm font-medium">No keys configured</div>
                    <div className="text-sm text-muted-foreground">
                      Add a key to start using providers.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                keys.map((key) => (
                  <TableRow key={key.key_id} className="hover:bg-muted/30">
                    <TableCell className="py-3 font-medium">
                      {key.base_key}
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="font-mono text-sm text-muted-foreground inline-block max-w-[520px] truncate">
                        {key.api_key}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 w-8 inline-flex items-center justify-center rounded-md
                                             text-muted-foreground hover:text-foreground hover:bg-muted">
                            …
                          </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>
                            Edit (soon)
                          </DropdownMenuItem>
                          <DeleteKeyButton key_id={key.key_id}/>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Pipelines */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Saved Pipelines</h3>
          <p className="text-sm text-muted-foreground">
            Pipelines can be reused across documents.
          </p>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Pipeline</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!pipelines.length ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-10 text-center">
                    <div className="text-sm font-medium">No pipelines saved</div>
                    <div className="text-sm text-muted-foreground">
                      Export a pipeline to save it here.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pipelines.map((p) => (
                  <TableRow key={p.pipeline_id} className="hover:bg-muted/30">
                    <TableCell className="py-3">
                      <div className="font-medium">
                        {p.pipelineName}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md
                                       text-muted-foreground hover:text-foreground hover:bg-muted"
                            aria-label="Pipeline actions"
                          >
                            …
                          </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DeletePipelineButton pipeline_id={p.pipeline_id}/>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* MCP URL */}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">MCP URL</h3>
          <p className="text-sm text-muted-foreground">
            Request or refresh the MCP endpoint used by your integrations.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <RequestUrlButton/>
        </div>
      </section>
    </div>
  );
}

