"use server";

import {createColors, ColorsSpec, readColors} from "./sdk.gen";
import {cookies} from "next/headers";
import {revalidatePath} from "next/cache";




export async function addColors(formData: FormData) {
  const pipeline = JSON.parse(
    formData.get("pipeline") as string
  ) as ColorsSpec;

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await createColors({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: pipeline,
  });

  if (result.error) {
    throw result.error;
  }

  revalidatePath("home/settings");
}




export async function fetchColors(): Promise<ColorsSpec> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await readColors({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (result.error) {
    throw result.error;
  }

  return result.data;
}