"use server";

import { cookies } from "next/headers";
import {
  readDocList,
  deleteDoc,
  createDoc,
  uploadDocFile,
  exportPipeline,
  listPipelines,
  loadPipeline,
  deletePipeline,
} from "./sdk.gen";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type Doc = {
  name: string;
  doc_id: string;
};

export async function fetchDocs(project_id: string): Promise<Doc[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await readDocList({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      project_id,
    },
  });

  if (response.error) {
    throw response.error;
  }

  return response.data;
}

export async function removeDoc(formData: FormData) {
  const project_id = String(formData.get("project_id") ?? "");
  const doc_id = String(formData.get("doc_id") ?? "");

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { message: "No access token found" };
  }

  const response = await deleteDoc({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      project_id,
      doc_id,
    },
  });

  if (response.error) {
    throw response.error;
  }

  revalidatePath(`/home/rag/${project_id}`);
  revalidatePath(`/home/rag/${project_id}/docs/${doc_id}`);

  redirect(`/home/rag/${project_id}`);
}

export async function addDoc(prevState: {}, formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { message: "No access token found" };
  }

  const name = formData.get("name");
  const project_id = formData.get("project_id");

  if (!name || typeof name !== "string") {
    return { message: "Invalid name" };
  }

  if (!project_id || typeof project_id !== "string") {
    return { message: "Invalid project_id" };
  }

  const response = await createDoc({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      project_id,
    },
    body: {
      name,
    },
  });

  if (response.error) {
    return { message: "Error while adding Doc" };
  }

  const doc_id = response.data?.doc_id;

  if (!doc_id) {
    return { message: "No doc_id returned" };
  }

  return { doc_id };
}

export async function uploadDoc(
  project_id: string,
  doc_id: string,
  file: File
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await uploadDocFile({
    path: { project_id, doc_id },
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    throw new Error("Upload failed");
  }

  return response.data;
}

/**
 * Export Pipeline
 */
export async function exportDocPipeline(formData: FormData) {
  const project_id = formData.get("project_id");
  const doc_id = formData.get("doc_id");
  const pipelineName = formData.get("pipelineName");

  if (
    typeof project_id !== "string" ||
    typeof doc_id !== "string" ||
    typeof pipelineName !== "string"
  ) {
    throw new Error("Invalid form data");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await exportPipeline({
    path: {
      project_id,
    },
    body: { doc_id, pipelineName },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    throw new Error("Export failed");
  }

  return response.data;
}

/**
 * List Pipelines
 */
export type ListPipeline = {
  pipeline_id: string;
  pipelineName: string;
};

export async function listDocPipelines(
  _formData?: FormData
): Promise<ListPipeline[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await listPipelines({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    throw new Error("Pipeline fetching failed");
  }

  return response.data;
}

/**
 * Load Pipeline
 */
export async function loadDocPipeline(formData: FormData) {
  const project_id = formData.get("project_id");
  const doc_id = formData.get("doc_id");
  const pipeline_id = formData.get("pipeline_id");

  if (
    typeof project_id !== "string" ||
    typeof doc_id !== "string" ||
    typeof pipeline_id !== "string"
  ) {
    throw new Error("Invalid form data");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await loadPipeline({
    path: {
      project_id,
    },
    body: { doc_id, pipeline_id },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    throw new Error("Loading failed");
  }

  revalidatePath(`/home/rag/${project_id}`);
  revalidatePath(`/home/rag/${project_id}/docs/${doc_id}`);

  return response.data;
}

export async function removeDocPipeline(pipeline_id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { message: "No access token found" };
  }

  const { error } = await deletePipeline({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      pipeline_id,
    },
  });

  if (error) {
    return { message: error };
  }

  revalidatePath("home/profile");
}