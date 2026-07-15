"use server";

import { cookies } from "next/headers";
import {revalidatePath} from "next/cache";
import {
  createEvaluator, createProject, deleteProject, EvaluatorSpec,
  exportProjectSDK,
  listExportedProjectsSDK,
  listSavedProjectsSDK, loadProjectSDK,
  readEvaluator, setProject, renameProjectSDK
} from "@/api/rag/projects/sdk.gen";


/**
 * Export Project
 */
export async function exportProject(formData: FormData) {
  const project_id = formData.get("project_id");
  const name = formData.get("name");

  if (
    typeof project_id !== "string" ||
    typeof name !== "string"
  ) {
    throw new Error("Invalid form data");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await exportProjectSDK({
    body: { project_id, name },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    throw new Error("Export failed");
  }

  return response.data;
}

/**
 * List Projects
 */


export type ListProject = {
  project_id: string;
  name: string;
};



export async function listSavedProjects(
  _formData?: FormData
): Promise<ListProject[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await listSavedProjectsSDK({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    console.error("[listSavedProjects] API error:", response.error);
    throw new Error(
      `Project fetching failed: ${JSON.stringify(response.error)}`
    );
  }

  return response.data;
}



export async function listExportedProjects(
  _formData?: FormData
): Promise<ListProject[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await listExportedProjectsSDK({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    throw new Error("Project fetching failed");
  }

  return response.data;
}

/**
 * Load Project
 */
export async function loadProject(formData: FormData) {
  const source_id = formData.get("source_id");
  const target_id = formData.get("target_id");

  if (
    typeof source_id !== "string" ||
    typeof target_id !== "string"
  ) {
    throw new Error("Invalid form data");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await loadProjectSDK({
    body: { source_id, target_id },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    throw new Error("Loading failed");
  }

  revalidatePath(`/home/rag/${target_id}`);

  return response.data;
}




export async function removeProjectAction(project_id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { message: "No access token found" };
  }

  const { error } = await deleteProject({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      project_id,
    },
  });


  if (error) {
    return { message: error };
  }

  revalidatePath(`/home/rag/${project_id}`);
}





export async function addProjectAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { message: "No access token found" };
  }

  const { data, error } = await createProject({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (error) {
    return { message: String(error) };
  }

  if (!data?.project_id || !data?.name) {
    return { message: "Invalid project response" };
  }

  revalidatePath("/home/rag");

  return {
    project_id: data.project_id,
    name: data.name,
  };
}






export async function setCurrentProject(project_id: string) {

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { message: "No access token found" };
  }

  const { error } = await setProject({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      project_id,
    },
  });


  if (error) {
    return { message: error };
  }
}


/**
 * Evaluator
 */


export async function addEvaluator(formData: FormData) {
  const evaluator = JSON.parse(
    formData.get("evaluator") as string
  ) as EvaluatorSpec;

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await createEvaluator({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: evaluator,
  });

  if (result.error) {
    throw result.error;
  }

  revalidatePath(`/home/rag/evaluator`);
}

export async function renameProject(project_id: string, name: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) throw new Error("No access token found");

  const { data, error } = await renameProjectSDK({
    path: { project_id },
    body: { name },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) throw new Error("Rename failed");
  revalidatePath("/home/rag");
  return data;
}

export async function fetchEvaluator(): Promise<EvaluatorSpec> {  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const result = await readEvaluator({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (result.error) {
    throw result.error;
  }

  return result.data;
}