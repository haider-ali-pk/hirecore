"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  buildInviteUrl,
  generateInviteToken,
  inviteExpiryFrom,
} from "@/lib/invitations";
import { appOrigin } from "@/lib/origin";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

type Intent = "invite" | "reissue" | "revoke";

type FieldErrors = { name?: string; email?: string };

export type InviteIssued = {
  status: "created";
  intent: "invite" | "reissue";
  email: string;
  inviteUrl: string;
  expiresAt: string;
  issuedAt: string;
};

export type InvitationState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      intent: Intent;
      message?: string;
      fieldErrors?: FieldErrors;
      /** Echoed back so the invite form keeps what was typed. */
      values?: { name: string; email: string };
    }
  | InviteIssued;

const idSchema = z.string().min(1).max(64);

const schema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("invite"),
    tenantId: idSchema,
    name: z
      .string()
      .trim()
      .min(2, "Enter the person's full name.")
      .max(80, "Keep the name under 80 characters."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address."),
  }),
  z.object({
    intent: z.literal("reissue"),
    tenantId: idSchema,
    invitationId: idSchema,
  }),
  z.object({
    intent: z.literal("revoke"),
    tenantId: idSchema,
    invitationId: idSchema,
  }),
]);

type Input = z.infer<typeof schema>;
type InviteInput = Extract<Input, { intent: "invite" }>;
type RowInput = Extract<Input, { intent: "reissue" | "revoke" }>;

const GENERIC_ERROR = "Something went wrong. Please try again.";

const detailPath = (tenantId: string) => `/super-admin/companies/${tenantId}`;

async function invite(actorId: string, input: InviteInput): Promise<InvitationState> {
  const { tenantId, name, email } = input;
  const now = new Date();

  const [tenant, existingUser, pending] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.invitation.findFirst({
      where: {
        tenantId,
        email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true },
    }),
  ]);

  if (!tenant) {
    return {
      status: "error",
      intent: "invite",
      message: "That company no longer exists.",
      values: { name, email },
    };
  }

  if (existingUser || pending) {
    return {
      status: "error",
      intent: "invite",
      fieldErrors: {
        email: existingUser
          ? "An account with this email already exists."
          : "This email already has a pending invitation. Use New link in the table.",
      },
      values: { name, email },
    };
  }

  const expiresAt = inviteExpiryFrom(now);
  const { token, tokenHash } = generateInviteToken();

  await prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.create({
      data: {
        tenantId,
        invitedById: actorId,
        email,
        name,
        role: "COMPANY_ADMIN",
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: "invitation.created",
        entityType: "Invitation",
        entityId: invitation.id,
        metadata: { email, role: "COMPANY_ADMIN" },
      },
    });
  });

  revalidatePath(detailPath(tenantId));

  return {
    status: "created",
    intent: "invite",
    email,
    inviteUrl: buildInviteUrl(await appOrigin(), token),
    expiresAt: expiresAt.toISOString(),
    issuedAt: now.toISOString(),
  };
}

async function reissue(actorId: string, input: RowInput): Promise<InvitationState> {
  const { tenantId, invitationId } = input;

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, tenantId },
    select: { email: true, name: true, role: true, acceptedAt: true },
  });

  if (!invitation) {
    return {
      status: "error",
      intent: "reissue",
      message: "That invitation no longer exists.",
    };
  }

  if (invitation.acceptedAt) {
    return {
      status: "error",
      intent: "reissue",
      message: "This invitation was already accepted.",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      status: "error",
      intent: "reissue",
      message: "This person already has an account, so a new link isn't needed.",
    };
  }

  const now = new Date();
  const expiresAt = inviteExpiryFrom(now);
  const { token, tokenHash } = generateInviteToken();

  await prisma.$transaction(async (tx) => {
    // Anything still pending for this person is replaced by the new link.
    const stale = await tx.invitation.findMany({
      where: {
        tenantId,
        email: invitation.email,
        acceptedAt: null,
        revokedAt: null,
      },
      select: { id: true },
    });

    if (stale.length > 0) {
      await tx.invitation.updateMany({
        where: { id: { in: stale.map((row) => row.id) } },
        data: { revokedAt: now },
      });

      await tx.auditLog.createMany({
        data: stale.map((row) => ({
          tenantId,
          actorId,
          action: "invitation.revoked",
          entityType: "Invitation",
          entityId: row.id,
          metadata: { email: invitation.email, reason: "replaced" },
        })),
      });
    }

    const created = await tx.invitation.create({
      data: {
        tenantId,
        invitedById: actorId,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: "invitation.created",
        entityType: "Invitation",
        entityId: created.id,
        metadata: { email: invitation.email, role: invitation.role, reissued: true },
      },
    });
  });

  revalidatePath(detailPath(tenantId));

  return {
    status: "created",
    intent: "reissue",
    email: invitation.email,
    inviteUrl: buildInviteUrl(await appOrigin(), token),
    expiresAt: expiresAt.toISOString(),
    issuedAt: now.toISOString(),
  };
}

async function revoke(actorId: string, input: RowInput): Promise<InvitationState> {
  const { tenantId, invitationId } = input;
  const now = new Date();

  const outcome = await prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.findFirst({
      where: { id: invitationId, tenantId },
      select: { email: true },
    });

    if (!invitation) return null;

    // Only a still-pending invitation can be revoked.
    const updated = await tx.invitation.updateMany({
      where: { id: invitationId, tenantId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });

    if (updated.count !== 1) return null;

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: "invitation.revoked",
        entityType: "Invitation",
        entityId: invitationId,
        metadata: { email: invitation.email, reason: "revoked" },
      },
    });

    return invitation.email;
  });

  if (outcome === null) {
    return {
      status: "error",
      intent: "revoke",
      message: "That invitation is no longer pending.",
    };
  }

  revalidatePath(detailPath(tenantId));
  return { status: "success", message: `Invitation for ${outcome} revoked.` };
}

export async function invitationAction(
  _previous: InvitationState,
  formData: FormData
): Promise<InvitationState> {
  const actor = await requireRole("SUPER_ADMIN");

  const raw = Object.fromEntries(formData);
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    if (raw.intent === "invite") {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "name" || key === "email") && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }

      return {
        status: "error",
        intent: "invite",
        fieldErrors,
        values: {
          name: typeof raw.name === "string" ? raw.name.trim() : "",
          email: typeof raw.email === "string" ? raw.email.trim() : "",
        },
      };
    }

    return {
      status: "error",
      intent: "revoke",
      message: "That request wasn't valid.",
    };
  }

  const input = parsed.data;

  try {
    switch (input.intent) {
      case "invite":
        return await invite(actor.id, input);
      case "reissue":
        return await reissue(actor.id, input);
      case "revoke":
        return await revoke(actor.id, input);
    }
  } catch (error) {
    console.error("Invitation action failed:", error);
    return { status: "error", intent: input.intent, message: GENERIC_ERROR };
  }
}