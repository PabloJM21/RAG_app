"use client";

import { useRef, useEffect } from "react";
import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/custom-ui/submitButton";
import { addDoc, uploadDoc } from "@/api/rag/docs/docs-action";

const initialState: {
  doc_id?: string;
  message?: string;
} = {};

export function UploadButton({ projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<File | null>(null);

  const [state, action] = useActionState(addDoc, initialState);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    fileRef.current = file;

    const formData = new FormData();
    formData.append("name", file.name);
    formData.append("project_id", projectId);

    action(formData);
  }

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!state.doc_id || !fileRef.current || uploading) return;

    setUploading(true);

    const file = fileRef.current;
    fileRef.current = null;

    uploadDoc(projectId, state.doc_id, file)
      .then(() => {
        window.location.href = `/home/rag/${projectId}/docs/${state.doc_id}`;
      })
      .finally(() => setUploading(false));
  }, [projectId, state.doc_id, uploading]);

  return (
    <form onSubmit={handleSubmit}>
      <SubmitButton text="Upload" />

      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={handleFileChange}
      />

      {state.message && <p className="text-red-500">{state.message}</p>}
    </form>
  );
}