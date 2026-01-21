"use client";

import { removeKey } from "@/app/api/rag/user_keys/keys-action";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface DeleteButtonProps {
  key_id: string;
}

export function DeleteButton({ key_id }: DeleteButtonProps) {
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
