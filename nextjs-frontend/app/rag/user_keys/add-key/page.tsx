"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addKey } from "@/app/api/rag/user_keys/keys-action";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submitButton";

const initialState = { message: "" };

export default function CreateKeyPage() {
  const [state, dispatch] = useActionState(addKey, initialState);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-800 dark:text-white">
            Add New API Key
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Configure a new API key for one of your providers.
          </p>
        </header>

        <form
          action={dispatch}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6"
        >
          <div className="space-y-6">
            {/* Base API */}
            <div className="space-y-3">
              <Label
                htmlFor="base_key"
                className="text-gray-700 dark:text-gray-300"
              >
                Base API
              </Label>

              <Input
                id="base_key"
                name="base_key"
                type="text"
                placeholder="e.g. OPENAI, DOCLING, ANTHROPIC"
                required
                className="w-full border-gray-300 dark:border-gray-600"
              />
            </div>

            {/* API Key */}
            <div className="space-y-3">
              <Label
                htmlFor="api_key_encrypted"
                className="text-gray-700 dark:text-gray-300"
              >
                API Key
              </Label>

              <Input
                id="api_key_encrypted"
                name="api_key_encrypted"
                type="password"
                placeholder="Paste your API key"
                required
                className="w-full border-gray-300 dark:border-gray-600"
              />
            </div>
          </div>

          <SubmitButton text="Add Key" />

          {state?.message && (
            <div className="mt-2 text-center text-sm text-red-500">
              <p>{state.message}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
