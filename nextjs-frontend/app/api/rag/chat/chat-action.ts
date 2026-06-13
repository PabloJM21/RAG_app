"use server";

import {runQuery, QuerySpec} from "./sdk.gen";
import {cookies} from "next/headers";



export async function submitQuery(formData: FormData) {
  try {
    const query = JSON.parse(
      formData.get("query") as string
    ) as QuerySpec;

    const cookieStore = await cookies();

    const token =
      cookieStore.get("accessToken")?.value;

    if (!token) {
      return {
        ok: false,
        error: "No access token found",
      };
    }

    const result = await runQuery({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        query: query.query,
        history: query.history ?? [],
      },
    });

    if (result.error) {
      const err = result.error as any;

      const message =
        err?.detail ||
        err?.message ||
        err?.error?.detail ||
        err?.body?.detail ||
        "RAG query failed";

      return {
        ok: false,
        error: String(message),
      };
    }

    return {
      ok: true,
      data: result.data,   // AnswerSpec - now typed, carries both answer + dashboard_list
    };
  } catch (error: any) {
    return {
      ok: false,
      error:
        error?.message ||
        "Unexpected error while submitting query",
    };
  }
}




