"use server";

import { createThemes, ThemeSettings, readThemes } from "./sdk.gen";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { THEME_PRESETS, ThemeName } from "@/components/frontend_data/themes";

export async function addThemes(formData: FormData) {

  console.log("formData pipeline =", formData.get("pipeline"));
  console.log("formData pipelineJson =", formData.get("pipelineJson"));
  console.log("formData selectedTheme =", formData.get("selectedTheme"));


  const pipeline = JSON.parse(
    formData.get("pipeline") as string
  ) as ThemeSettings;

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const normalized: ThemeSettings = {
    selectedTheme:
      pipeline?.selectedTheme && pipeline.selectedTheme in THEME_PRESETS
        ? (pipeline.selectedTheme as ThemeName)
        : "neutral",
  };

  const result = await createThemes({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: normalized,
  });

  if (result.error) {
    throw result.error;
  }

  revalidatePath("home/settings");
}

export async function fetchThemes(): Promise<ThemeSettings> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await readThemes({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (result.error) {
    throw result.error;
  }

  const saved = result.data;

  return {
    selectedTheme:
      saved?.selectedTheme && saved.selectedTheme in THEME_PRESETS
        ? (saved.selectedTheme as ThemeName)
        : "neutral",
  };
}