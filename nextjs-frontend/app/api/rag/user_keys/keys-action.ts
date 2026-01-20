"use server";


import {cookies} from "next/headers";
import {revalidatePath} from "next/cache";
import {createKey, KeySpec, readKey, deleteKey} from "./sdk.gen";





export async function removeKey(id: string) {
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
      key_id: id,
    },
  });

  if (error) {
    return { message: error };
  }
  revalidatePath("rag/user_keys");
}



export async function addKey(formData: FormData) {

  const key_id = formData.get("key_id") as string;
  const keydata = JSON.parse(formData.get("keydata") as string) as KeySpec;

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await createKey({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path:{
      key_id: key_id,
    },
    body: keydata,
  });

  if (result.error) {
    throw result.error;
  }

  revalidatePath(`rag/user_keys`);
}




export async function fetchKeys(key_id: string): Promise<KeySpec> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await readKey({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path:{
      key_id: key_id,
    },
  });

  if (result.error) {
    throw result.error;
  }

  return result.data;
}


