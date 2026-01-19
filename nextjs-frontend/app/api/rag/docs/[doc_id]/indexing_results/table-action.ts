"use server";


import {cookies} from "next/headers";
import {revalidatePath} from "next/cache";
import {createResults, ResultsSpec, readResults} from "./sdk.gen";








export async function addResults(formData: FormData) {

  const doc_id = formData.get("doc_id") as string;
  const results = JSON.parse(formData.get("results") as string) as ResultsSpec;

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await createResults({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path:{
      doc_id: doc_id,
    },
    body: results,
  });

  if (result.error) {
    throw result.error;
  }

  revalidatePath(`rag/docs/${doc_id}`);
}




export async function fetchResults(doc_id: string): Promise<ResultsSpec> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await readResults({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path:{
      doc_id: doc_id,
    },
  });

  if (result.error) {
    throw result.error;
  }

  return result.data;
}