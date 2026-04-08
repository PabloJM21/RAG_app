import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { themedPrimaryButtonStyle } from "@/components/custom-ui/themeStyles";

export function SubmitButton({ text }: { text: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-full"
      style={themedPrimaryButtonStyle}
      type="submit"
      disabled={pending}
    >
      {pending ? "Loading..." : text}
    </Button>
  );
}