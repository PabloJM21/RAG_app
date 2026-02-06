"use server";

import { cookies } from "next/headers";
import {readDocList, deleteDoc, createDoc, uploadDocFile, exportPipeline, PipelineSpec} from "./sdk.gen";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {createKey, deleteKey, KeyRead, readKeyList} from "@/app/api/rag/profile/sdk.gen";

export type Doc = {
  name: string;
  doc_id: string;
};

export async function fetchDocs(): Promise<Doc[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await readDocList({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    throw response.error;
  }

  return response.data;
}


export async function removeDoc(formData: FormData) {

  const id = String(formData.get("doc_id") ?? "");

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
      doc_id: id,
    },
  });

  if (response.error) {
    throw response.error;
  }
  return response.data;
}



export async function addDoc(prevState: {}, formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { message: "No access token found" };
  }

  // 1. Extract fields from FormData
  const name = formData.get("name");
  if (!name || typeof name !== "string") {
    return { message: "Invalid name" };
  }

  // 2. Call FastAPI JSON endpoint
  const response = await createDoc({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      name,
    },
  });

  // 3. Handle API errors
  if (response.error) {
    return { message: "Error while adding Doc" };
  }

  // 4. Extract doc_id correctly
  const doc_id = response.data?.doc_id;

  if (!doc_id) {
    return { message: "No doc_id returned" };
  }

  // 5. Return doc_id to client
  return { doc_id };
}




export async function uploadDoc(
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
    path: { doc_id },
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

  const source_id = formData.get("source_id");
  const target_id = formData.get("target_id");

  if (typeof source_id !== "string" || typeof target_id !== "string") {
    throw new Error("Invalid form data");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }


  const response = await exportPipeline({
    body: {source_id, target_id},
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    throw new Error("Upload failed");
  }

  return response.data;
}



{/*
**
 * Store Pipelines
 *



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
      pipeline_id: pipeline_id,
    },
  });

  if (error) {
    return { message: error };
  }
  revalidatePath("rag");
}





export async function addDocPipeline(pipeline_name, doc_id: string) {

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { message: "No access token found" };
  }


  if (!pipeline_name || typeof pipeline_name !== "string") {
    return { message: "Invalid pipeline_name" };
  }



  // Call SDK with plain object
  const { error } = await createPipeline({
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json", // ✅ Force JSON
    },
    path: {
      doc_id: doc_id,
    },
    body: pipeline_name
  });

  if (error) {
    return { message: typeof error.detail === "string" ? error.detail : "Failed to store pipeline" };
  }
  revalidatePath("rag");
}






export async function fetchDocPipelines(): Promise<KeyRead[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await readPipelineList({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    throw response.error;
  }

  return response.data;
}


*/}