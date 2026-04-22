"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createPipeline,
  PipelineSpec,
  readPipeline,
  runPipeline,
} from "./sdk.gen";

export async function runExport(formData: FormData) {
  const project_id = formData.get("project_id") as string;
  const doc_id = formData.get("doc_id") as string;

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { ok: false, error: "No access token found" };
  }

  const result = await runPipeline({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      project_id,
      doc_id,
    },
  });

  if (result.error) {
    const err = result.error as any;
    const message =
      err?.detail ||
      err?.message ||
      err?.error?.detail ||
      err?.body?.detail ||
      "Staging failed";

    return { ok: false, error: String(message) };
  }

  revalidatePath(`/home/rag/${project_id}/docs/${doc_id}`);
  return { ok: true };
}

export async function addRetrievalPipeline(formData: FormData) {
  const project_id = formData.get("project_id") as string;
  const doc_id = formData.get("doc_id") as string;
  const pipeline = JSON.parse(formData.get("pipeline") as string) as PipelineSpec;

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await createPipeline({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      project_id,
      doc_id,
    },
    body: pipeline,
  });

  if (result.error) {
    throw result.error;
  }

  revalidatePath(`/home/rag/${project_id}/docs/${doc_id}`);
}

export async function fetchRetrievalPipeline(
  project_id: string,
  doc_id: string
): Promise<PipelineSpec> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await readPipeline({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      project_id,
      doc_id,
    },
  });

  if (result.error) {
    throw result.error;
  }

  return result.data;
}