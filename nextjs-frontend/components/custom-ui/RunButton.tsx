import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type ActionButtonProps = {
  onClick: () => void
}

export function RunButton({ onClick }: ActionButtonProps) {
  return (
    <button onClick={onClick} style={{ marginLeft: 8 }}>
      Run Extraction
    </button>
  )
}
