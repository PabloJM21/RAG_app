"use client";

import { removeKey } from "@/api/rag/profile/keys-action";
import {removeDocPipeline} from "@/api/rag/docs/docs-action";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {removeProjectAction} from "@/api/rag/projects/projects-action";

interface DeleteKeyButtonProps {
  key_id: string;
}

export function DeleteKeyButton({ key_id }: DeleteKeyButtonProps) {
  const handleDelete = async () => {
    await removeKey(key_id);
  };

  return (
    <DropdownMenuItem
      className="text-red-500 cursor-pointer"
      onClick={handleDelete}
    >
      Delete
    </DropdownMenuItem>
  );
}




interface DeleteProjectButtonProps {
  project_id: string;
}

export function DeleteProjectButton({
  project_id,
}: DeleteProjectButtonProps) {
  const handleDelete = async () => {
    await removeProjectAction(project_id);
  };

  return (
    <DropdownMenuItem
      className="text-red-500 cursor-pointer"
      onClick={handleDelete}
    >
      Delete
    </DropdownMenuItem>
  );
}



interface DeletePipelineButtonProps {
  pipeline_id: string;
}

export function DeletePipelineButton({
  pipeline_id,
}: DeletePipelineButtonProps) {
  const handleDelete = async () => {
    await removeDocPipeline(pipeline_id);
  };

  return (
    <DropdownMenuItem
      className="text-red-500 cursor-pointer"
      onClick={handleDelete}
    >
      Delete
    </DropdownMenuItem>
  );
}