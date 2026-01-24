"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

export function RunButton({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      style={{ marginLeft: 8 }}
    >
      {pending ? `Running ${label}…` : `Run ${label}`}
    </Button>
  )
}


