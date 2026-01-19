"use client";

import { useFormStatus } from "react-dom";
import { removeDoc } from "@/app/api/rag/docs/docs-action";
import {Button} from "@/components/ui/button";

interface DeleteButtonProps {
  doc_id: string;
}

export function DeleteButton({ doc_id }: DeleteButtonProps) {
  const handleDelete = async () => {
    await removeDoc(doc_id);
  };
  const { pending } = useFormStatus();

  return (

    <form onSubmit={handleDelete}>
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Loading..." : "Delete"}
      </Button>
    </form>

  );
}




