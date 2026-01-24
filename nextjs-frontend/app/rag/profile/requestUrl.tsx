"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { getUrl } from "@/app/api/rag/profile/keys-action";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader,
} from "@/components/ui/table";

const initialState: {
  mcp_url?: string;
  message?: string;
} = {};


function SubmitRequestButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Requesting…" : "Expose URL"}
    </Button>
  );
}

export function RequestUrlButton() {
  const [state, action] = useActionState(getUrl, initialState);

  return (
    <>
      <form action={action}>
        <SubmitRequestButton />
      </form>

      <section className="p-6 bg-white rounded-lg shadow-lg mt-8">
        <Table className="min-w-full text-sm">
          <TableBody>
            {!state.mcp_url ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No URL exposed.
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  {state.mcp_url}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

    </>
  );
}

