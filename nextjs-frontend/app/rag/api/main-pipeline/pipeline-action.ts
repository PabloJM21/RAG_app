"use server";


import {cookies} from "next/headers";
import {revalidatePath} from "next/cache";
import {createPipeline, PipelineSpec, readPipeline} from "./sdk.gen";







export async function addPipeline(formData: FormData) {
  const pipeline = JSON.parse(
    formData.get("pipeline") as string
  ) as PipelineSpec;

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await createPipeline({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: pipeline,
  });

  if (result.error) {
    throw result.error;
  }

  revalidatePath("/main-pipeline");
}




export async function fetchPipeline(): Promise<PipelineSpec> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await readPipeline({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (result.error) {
    throw result.error;
  }

  return result.data;
}