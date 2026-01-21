"use server";


import {cookies} from "next/headers";
import {revalidatePath} from "next/cache";
import {createKey, readKeyList, deleteKey, KeyRead} from "./sdk.gen";
import { keySchema } from "@/lib/definitions";

import { redirect } from "next/navigation";
import {KeyCreate} from "./sdk.gen";



export async function removeKey(key_id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { message: "No access token found" };
  }

  const { error } = await deleteKey({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      key_id: key_id,
    },
  });

  if (error) {
    return { message: error };
  }
  revalidatePath("rag/user_keys");
}





export async function addKey(prevState: {}, formData: FormData) {

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { message: "No access token found" };
  }


  // 1. Extract fields from FormData
  const base_key = formData.get("base_key");
  if (!base_key || typeof base_key !== "string") {
    return { message: "Invalid base_key" };
  }

  const api_key = formData.get("api_key");
  if (!api_key || typeof api_key !== "string") {
    return { message: "Invalid api_key" };
  }

  // 4️⃣ Debug the body
  const bodyToSend = { base_key, api_key };
  console.log("DEBUG bodyToSend:", bodyToSend);
  console.log("DEBUG types:", {
    base_key: typeof base_key,
    api_key: typeof api_key,
  });


  // Call SDK with plain object
  const { error } = await createKey({
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json", // ✅ Force JSON
    },
    body: { base_key, api_key }, // ✅ Must be stringified
  });

  if (error) {
    return { message: typeof error.detail === "string" ? error.detail : "Failed to create key" };
  }

  redirect("/rag/user_keys");
}






export async function fetchKeys(): Promise<KeyRead[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await readKeyList({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    throw response.error;
  }

  return response.data;
}


