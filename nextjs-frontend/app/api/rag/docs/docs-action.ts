"use server";

import { cookies } from "next/headers";
import { readDocList, deleteDoc, createDoc, uploadDocFile } from "./sdk.gen";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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


export async function removeDoc(id: string) {
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