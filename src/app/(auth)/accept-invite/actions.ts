"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { hashInviteToken, inviteState } from "@/lib/invitations";
import { validatePassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

type FieldName = "name" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

export type AcceptInviteState =
  | { status: "idle" }
  | {
      status: "error";
      message?: string;
      fieldErrors?: FieldErrors;
      /** Echoed back so the name field keeps its value after an error. */
      name?: string;
    };

const INVALID_MESSAGE = "This invitation is no longer valid. Ask for a new one.";
const ACTIVE_TENANT_STATUSES: readonly string[] = ["TRIAL", "ACTIVE"];

const schema = z.object({
  token: z.string().min(20).max(200),
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Keep the name under 80 characters."),
  password: z.string().max(200, "That password is too long."),
  confirmPassword: z.string().max(200),
});

const isFieldName = (value: string): value is FieldName =>
  value === "name" || value === "password" || value === "confirmPassword";

/** Thrown inside the transaction when someone else used the invitation first. */
class InviteUnavailableError extends Error {}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function isCredentialsFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "CredentialsSignin"
  );
}

export async function acceptInviteAction(
  _previous: AcceptInviteState,
  formData: FormData
): Promise<AcceptInviteState> {
  const rawName = formData.get("name");
  const submittedName = typeof rawName === "string" ? rawName.trim() : "";

  const parsed = schema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    let message: string | undefined;

    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && isFieldName(key)) {
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      } else {
        message = INVALID_MESSAGE;
      }
    }

    return { status: "error", message, fieldErrors, name: submittedName };
  }

  const { token, name, password, confirmPassword } = parsed.data;

  const invite = await prisma.invitation.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    select: {
      id: true,
      tenantId: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      tenant: { select: { status: true } },
    },
  });

  if (!invite || inviteState(invite) !== "pending") {
    return { status: "error", message: INVALID_MESSAGE, name };
  }

  if (!ACTIVE_TENANT_STATUSES.includes(invite.tenant.status)) {
    return {
      status: "error",
      message: "This workspace isn't active. Contact your administrator.",
      name,
    };
  }

  const passwordError = validatePassword(password, { email: invite.email });
  if (passwordError) {
    return { status: "error", fieldErrors: { password: passwordError }, name };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      fieldErrors: { confirmPassword: "The passwords don't match." },
      name,
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Atomic claim: only one concurrent request can flip acceptedAt.
      const claimed = await tx.invitation.updateMany({
        where: {
          id: invite.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { acceptedAt: now },
      });

      if (claimed.count !== 1) throw new InviteUnavailableError();

      const user = await tx.user.create({
        data: {
          tenantId: invite.tenantId,
          email: invite.email,
          name,
          passwordHash,
          role: invite.role,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      await tx.auditLog.createMany({
        data: [
          {
            tenantId: invite.tenantId,
            actorId: user.id,
            action: "invitation.accepted",
            entityType: "Invitation",
            entityId: invite.id,
            metadata: { role: invite.role },
          },
          {
            tenantId: invite.tenantId,
            actorId: user.id,
            action: "user.created",
            entityType: "User",
            entityId: user.id,
            metadata: { role: invite.role, source: "invitation" },
          },
        ],
      });
    });
  } catch (error) {
    if (error instanceof InviteUnavailableError) {
      return { status: "error", message: INVALID_MESSAGE, name };
    }

    if (isUniqueViolation(error)) {
      return {
        status: "error",
        message: "An account with this email already exists. Try signing in instead.",
        name,
      };
    }

    console.error("Failed to accept invitation:", error);
    return {
      status: "error",
      message: "Something went wrong while creating your account. Please try again.",
      name,
    };
  }

  try {
    // Success throws Next's redirect, which must not be swallowed. The login
    // page then forwards the new user to their own portal.
    await signIn("credentials", {
      email: invite.email,
      password,
      redirectTo: "/login",
    });
  } catch (error) {
    if (isCredentialsFailure(error)) {
      return {
        status: "error",
        message:
          "Your account was created, but we couldn't sign you in automatically. Use the sign-in page to continue.",
        name,
      };
    }
    throw error;
  }

  return { status: "idle" };
}