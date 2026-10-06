"use server";

import { z } from "zod";
import { signIn } from "@/lib/auth";

export type LoginState = {
  status: "idle" | "error";
  message?: string;
  /** Echoed back so the email field keeps its value after a failed attempt. */
  email?: string;
};

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

const MESSAGES: Record<string, string> = {
  credentials: "That email and password don't match. Check them and try again.",
  account_inactive:
    "This account isn't active. Contact your company administrator.",
  workspace_inactive:
    "Your company's workspace is suspended. Contact your administrator.",
};

const FALLBACK_MESSAGE = "We couldn't sign you in. Please try again.";

/** Only same-site paths are allowed as a post-login destination. */
function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string") return "/login";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/login";
  }
  return value;
}

/** Returns the Auth.js error code for a failed credentials sign-in, else null. */
function credentialsErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("type" in error) || error.type !== "CredentialsSignin") return null;
  return "code" in error && typeof error.code === "string"
    ? error.code
    : "credentials";
}

export async function loginAction(
  _previous: LoginState,
  formData: FormData
): Promise<LoginState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";

  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter a valid email address and your password.",
      email,
    };
  }

  try {
    // On success this throws Next's redirect, which must not be swallowed.
    // Signed-in users who land on /login are forwarded to their own portal.
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeRedirectPath(formData.get("callbackUrl")),
    });
  } catch (error) {
    const code = credentialsErrorCode(error);
    if (code === null) throw error;

    return {
      status: "error",
      message: MESSAGES[code] ?? FALLBACK_MESSAGE,
      email,
    };
  }

  return { status: "idle" };
}