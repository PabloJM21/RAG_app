"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ProjectTabsBar } from "@/components/custom-ui/PipelineTabsBar";
import {
  addProjectAction,
  removeProjectAction,
} from "@/app/api/rag/projects/projects-action";

type Project = {
  project_id: string;
  name: string;
};

function activeProjectIdFromPath(pathname: string): string {
  if (pathname === "/home/rag/evaluator") return "evaluator";

  const match = pathname.match(/^\/home\/rag\/([^/]+)(?:\/|$)/);
  if (match) return match[1];

  return "";
}

export default function RagShell({
  initialProjects,
  children,
}: {
  initialProjects: Project[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [projects, setProjects] = React.useState<Project[]>(initialProjects);

  const [activeProjectId, setActiveProjectId] = React.useState(() =>
    activeProjectIdFromPath(pathname)
  );

  React.useEffect(() => {
    setActiveProjectId(activeProjectIdFromPath(pathname));
  }, [pathname]);

  const addProject = React.useCallback(async () => {

    const result = await addProjectAction();

    if (result?.message || !result?.project_id) {
      return;
    }

    const newProject: Project = {
      project_id: result.project_id,
      name: result.name,
    };

    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newProject.project_id);

    window.location.href = `/home/rag/${newProject.project_id}`;
  }, []);

  const deleteProject = React.useCallback(
    async (project_id: string) => {
      const projectToDelete = projects.find(
        (project) => project.project_id === project_id
      );

      if (!projectToDelete) return;

      const remaining = projects.filter(
        (project) => project.project_id !== project_id
      );

      let nextHref = pathname;

      if (activeProjectId === project_id) {
        nextHref =
          remaining.length > 0
            ? `/home/rag/${remaining[0].project_id}`
            : "/home/rag/evaluator";
      }

      setProjects(remaining);

      const result = await removeProjectAction(project_id);

      if (result?.message) {
        setProjects((prev) => [...prev, projectToDelete]);
        return;
      }

      if (activeProjectId === project_id) {
        window.location.href = nextHref;
      }
    },
    [projects, activeProjectId, pathname]
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
        height: "100vh", // 👈 important
      }}
    >
      {/* main content grows */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {children}
      </div>

      {/* pinned to bottom */}
      <ProjectTabsBar
        projects={projects}
        currentProjectId={activeProjectId}
        addProject={addProject}
        deleteProject={deleteProject}
      />
    </div>
  );
}