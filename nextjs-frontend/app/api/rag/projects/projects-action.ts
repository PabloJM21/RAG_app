"use server";

import { cookies } from "next/headers";


/**
 * Export Project
 */
export async function exportProject(formData: FormData) {
  const project_id = formData.get("project_id");
  const projectName = formData.get("projectName");

  if (
    typeof project_id !== "string" ||
    typeof projectName !== "string"
  ) {
    throw new Error("Invalid form data");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await exportProjectSDK({
    body: { project_id, projectName },
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


export async function listSavedProjects(
  _formData?: FormData
): Promise<string[]> {
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
    throw new Error("Project fetching failed");
  }

  return response.data;
}




export type ListProject = {
  project_id: string;
  projectName: string;
};


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

  revalidatePath(`/home/rag/${project_id}`);
  revalidatePath(`/home/rag/${project_id}/docs/${doc_id}`);

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

  revalidatePath("home/profile");
}





export async function addProjectAction(project_id: string) {

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

  revalidatePath("home/profile");
}