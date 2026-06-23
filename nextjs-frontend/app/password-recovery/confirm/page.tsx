"use client";

import { useActionState, Suspense } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { passwordResetConfirm } from "@/api/password-recovery/password-reset-action";
import { SubmitButton } from "@/../components/ui/submitButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/../components/ui/card";
import { Label } from "@/../components/ui/label";
import { Input } from "@/../components/ui/input";
import { FieldError, FormError } from "@/../components/ui/FormError";
import HomeBackground from "@/home-background";

function ResetPasswordForm() {
  const [state, dispatch] = useActionState(passwordResetConfirm, undefined);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    notFound();
  }

  return (
    <form action={dispatch}>
      <Card className="w-full max-w-sm rounded-lg border border-gray-300 bg-white/95 shadow-2xl backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold text-gray-800 dark:text-white">
            Reset your Password
          </CardTitle>
          <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
            Enter the new password and confirm it.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6 p-6">
          <div className="grid gap-3">
            <Label
              htmlFor="password"
              className="text-gray-700 dark:text-gray-300"
            >
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="border-gray-300 dark:border-gray-600"
            />
          </div>
          <FieldError state={state} field="password" />

          <div className="grid gap-3">
            <Label
              htmlFor="passwordConfirm"
              className="text-gray-700 dark:text-gray-300"
            >
              Password Confirm
            </Label>
            <Input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              required
              className="border-gray-300 dark:border-gray-600"
            />
          </div>
          <FieldError state={state} field="passwordConfirm" />

          <input
            type="hidden"
            id="resetToken"
            name="resetToken"
            value={token}
            readOnly
          />

          <SubmitButton text="Send" />
          <FormError state={state} />
        </CardContent>
      </Card>
    </form>
  );
}

export default function Page() {
  return (
    <HomeBackground>
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <Suspense fallback={<div className="text-white">Loading reset form...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </HomeBackground>
  );
}