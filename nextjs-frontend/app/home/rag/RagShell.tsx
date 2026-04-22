"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ProjectTabsBar } from "@/components/custom-ui/PipelineTabsBar";
import {addProjectAction, removeProjectAction} from "@/app/api/rag/projects/projects-action";


function nextproject_id(project_ids: number[]): string {
  const max = project_ids.length ? Math.max(...project_ids) : 0;
  return String(max + 1);
}

function activeproject_idFromPath(pathname: string): string {
  if (pathname === "/home/rag/evaluator") return "evaluator";

  const match = pathname.match(/^\/home\/rag\/(\d+)(?:\/|$)/);
  if (match) return match[1];

  return "";
}

export default function RagShell({
  initialproject_ids,
  children,
}: {
  initialproject_ids: number[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [project_ids, setproject_ids] = React.useState<number[]>(() =>
    [...initialproject_ids].sort((a, b) => a - b)
  );

  const currentproject_id = React.useMemo(
    () => activeproject_idFromPath(pathname),
    [pathname]
  );

  const addProject = React.useCallback(async () => {
    const newId = nextproject_id(project_ids);

    setproject_ids((prev) => [...prev, Number(newId)].sort((a, b) => a - b));

    const result = await addProjectAction(newId);

    if (result?.message) {
      setproject_ids((prev) => prev.filter((x) => String(x) !== newId));
      return;
    }

    window.location.href = `/home/rag/${newId}`;
  }, [project_ids]);

  const deleteProject = React.useCallback(
    async (id: string) => {
      const numericId = Number(id);
      const remaining = project_ids.filter((x) => x !== numericId);

      let nextHref = pathname;

      if (currentproject_id === id) {
        nextHref =
          remaining.length > 0
            ? `/home/rag/${Math.min(...remaining)}`
            : "/home/rag/evaluator";
      }

      setproject_ids(remaining);

      const result = await removeProjectAction(id);

      if (result?.message) {
        setproject_ids((prev) => [...prev, numericId].sort((a, b) => a - b));
        return;
      }

      if (currentproject_id === id) {
        window.location.href = nextHref;
      }
    },
    [project_ids, currentproject_id, pathname]
  );

  return (
    <div
      style={{
        background: "var(--theme-panel-bg)",
        borderRadius: 12,
        padding: 4,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <ProjectTabsBar
        project_ids={project_ids}
        currentproject_id={currentproject_id}
        addProject={addProject}
        deleteProject={deleteProject}
      />

      {children}
    </div>
  );
}