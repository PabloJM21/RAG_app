"use client";

import { useRef, useEffect } from "react";
import { useActionState, useState } from "react";

import {SubmitButton} from "@/components/ui/submitButton";
import {addDoc, uploadDoc} from "@/app/api/rag/docs/docs-action"

const initialState: {
  doc_id?: string;
  message?: string;
} = {};

export function UploadButton() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<File | null>(null);

  const [state, action] = useActionState(addDoc, initialState);

  // 1️⃣ Open file picker on submit
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    inputRef.current?.click();
  }

  // 2️⃣ Store file + trigger Server Action
  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    fileRef.current = file;

    // create FormData for addDoc (metadata only)
    const formData = new FormData();
    formData.append("name", file.name);

    action(formData); // ✅ invoke Server Action correctly
  }

  // 3️⃣ When doc_id arrives → upload file
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!state.doc_id || !fileRef.current || uploading) return;

    setUploading(true);

    const file = fileRef.current;
    fileRef.current = null; // prevent duplicate uploads

    uploadDoc(state.doc_id, file)
    .then(() => window.location.reload())
    .finally(() => setUploading(false));
}, [state.doc_id]);




  return (
    <form onSubmit={handleSubmit}>
      <SubmitButton text="Upload" />

      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={handleFileChange}
      />

      {state.message && (
        <p className="text-red-500">{state.message}</p>
      )}
    </form>
  );
}
