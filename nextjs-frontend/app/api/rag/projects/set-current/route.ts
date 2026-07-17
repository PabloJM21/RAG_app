import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/rag/projects/set-current?project_id=xxx
 * Proxies to the backend's POST /projects/set/{project_id} with the auth cookie.
 * Called from the client-side RagShell useEffect so it can use the server cookie.
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const project_id = searchParams.get("project_id");

  if (!project_id) {
    return NextResponse.json({ error: "Missing project_id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const backendUrl = process.env.API_BASE_URL ?? "http://localhost:8000";

  try {
    const res = await fetch(`${backendUrl}/projects/set/${project_id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Backend error" }, { status: res.status });
    }

    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
