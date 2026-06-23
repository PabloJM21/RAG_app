import {AuthJwtLoginErrors } from "@/api/login/sdk.gen";
import {RegisterRegisterErrors} from "@/api/register/sdk.gen"
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type AuthJwtLoginError = AuthJwtLoginErrors[keyof AuthJwtLoginErrors];
export type RegisterRegisterError =
  RegisterRegisterErrors[keyof RegisterRegisterErrors];


export function getErrorMessage(
  error: RegisterRegisterError | AuthJwtLoginError,
): string {
  let errorMessage = "An unknown error occurred";

  if (typeof error.detail === "string") {
    // If detail is a string, use it directly
    errorMessage = error.detail;
  } else if (typeof error.detail === "object" && "reason" in error.detail) {
    // If detail is an object with a 'reason' key, use that
    errorMessage = error.detail["reason"];
  }

  return errorMessage;
}
