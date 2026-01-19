"use server";


import {cookies} from "next/headers";
import {revalidatePath} from "next/cache";
import {createPipeline, PipelineSpec, readPipeline, runPipeline} from "./sdk.gen";




export async function runExport(doc_id: string) {

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await runPipeline({
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

  revalidatePath(`rag/docs/${doc_id}`);
}




export async function addRetrievalPipeline(formData: FormData) {

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
    path:{
      doc_id: doc_id,
    },
    body: pipeline,
  });

  if (result.error) {
    throw result.error;
  }

  revalidatePath(`rag/docs/${doc_id}`);
}




export async function fetchRetrievalPipeline(doc_id: string): Promise<PipelineSpec> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await readPipeline({
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



