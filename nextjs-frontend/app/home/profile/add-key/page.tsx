"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submitButton";
import { addKey } from "@/app/api/rag/profile/keys-action";

const initialState: { message?: string } = {};

export default function CreateKeyPage() {
  const [state, dispatch] = useActionState(addKey, initialState);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">Add API Key</h1>
            <Link href="/home/profile">
              <Button variant="ghost" size="sm">
                Back
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure a new provider key. You can remove it anytime.
          </p>
        </header>

        <form
          action={dispatch}
          className="rounded-xl border bg-card p-6 space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="base_key" className="text-sm">
              Base API
            </Label>
            <Input
              id="base_key"
              name="base_key"
              type="text"
              placeholder="e.g. OPENAI, DOCLING, ANTHROPIC"
              required
            />
            <p className="text-xs text-muted-foreground">
              A short provider identifier you’ll recognize later.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key" className="text-sm">
              API Key
            </Label>
            <Input
              id="api_key"
              name="api_key"
              type="password"
              placeholder="Paste your API key"
              required
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Stored securely. We recommend using environment-scoped keys where possible.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link href="/rag/profile">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>

            <SubmitButton text="Add Key" />
          </div>

          {state?.message && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {state.message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
