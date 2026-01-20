import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving pipeline…" : "Save Pipeline"}
    </Button>
  );
}





