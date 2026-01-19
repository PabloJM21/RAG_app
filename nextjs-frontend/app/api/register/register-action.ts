"use server";

import { redirect } from "next/navigation";

import { registerRegister } from "./sdk.gen";

import { registerSchema } from "@/lib/definitions";
import { getErrorMessage } from "@/lib/utils";

export async function register(prevState: unknown, formData: FormData) {
  const validatedFields = registerSchema.safeParse({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  const input = {
    body: {
      email,
      password,
    },
  };
  try {
    const result = await registerRegister(input);

    // Log the full result so you can see what the SDK returned
    console.log("registerRegister result:", result);

    if (result?.error) {
      console.error("Backend returned error:", result.error);
      return { server_validation_error: getErrorMessage(result.error) };
    }

  } catch (err) {
    // Log everything we can about the thrown error
    console.error("Registration error (thrown):", err);

    if (err instanceof Error) {
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
    }

    return {
      server_error: "An unexpected error occurred. Please try again later.",
    };
  }
  redirect("/login");
}
