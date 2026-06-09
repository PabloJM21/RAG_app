"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createGenerator,
  GeneratorSpec,
  readGenerator,
  createRetrievers,
  RetrieversSpec,
  readRetrievers,
  runPipeline,
} from "./sdk.gen";

export async function run(project_id: string, stage: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await runPipeline({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      project_id,
      stage,
    },
  });

  if (result.error) {
    throw result.error;
  }

  revalidatePath(`/home/rag/${project_id}`);
}

export async function addGenerator(formData: FormData) {
  const pipeline = JSON.parse(
    formData.get("pipeline") as string
  ) as GeneratorSpec;

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await createGenerator({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: pipeline,
  });

  if (result.error) {
    throw result.error;
  }

  revalidatePath(`/home/profile`);
}




export async function fetchGenerator(): Promise<GeneratorSpec> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await readGenerator({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (result.error) {
    throw result.error;
  }

  return result.data;
}





export async function addRetrievers(formData: FormData) {
  const project_id = formData.get("project_id") as string;
  const pipeline = JSON.parse(
    formData.get("pipeline") as string
  ) as RetrieversSpec;

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await createRetrievers({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      project_id,
    },
    body: pipeline,
  });

  if (result.error) {
    throw result.error;
  }

  revalidatePath(`/home/rag/${project_id}`);
}

export async function fetchRetrievers(project_id: string): Promise<RetrieversSpec> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await readRetrievers({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      project_id,
    },
  });

  if (result.error) {
    throw result.error;
  }

  return result.data;
}