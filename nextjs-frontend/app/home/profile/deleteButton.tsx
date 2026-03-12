"use client";

import { removeKey } from "@/app/api/rag/profile/keys-action";
import {removeDocPipeline} from "@/app/api/rag/docs/docs-action";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

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
