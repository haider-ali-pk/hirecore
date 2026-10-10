"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export type UserStatusState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const schema = z.object({
  userId: z.string().min(1).max(64),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  reason: z.string().trim().max(200, "Keep the reason under 200 characters.").optional(),
});

const fail = (message: string): UserStatusState => ({ status: "error", message });

export async function setUserStatusAction(
  _previous: UserStatusState,
  formData: FormData
): Promise<UserStatusState> {
  const actor = await requireRole("SUPER_ADMIN");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "That request wasn't valid.");
  }

  const { userId, status } = parsed.data;
  const reason = parsed.data.reason || undefined;

  if (userId === actor.id) {
    return fail("You can't change the status of your own account.");
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, status: true, tenantId: true },
      });

      if (!user) return { kind: "missing" as const };
      if (user.status === status) return { kind: "unchanged" as const, name: user.name };
      if (user.status === "INVITED") return { kind: "invited" as const };

      await tx.user.update({ where: { id: userId }, data: { status } });

      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorId: actor.id,
          action: "user.status_changed",
          entityType: "User",
          entityId: userId,
          metadata: {
            email: user.email,
            from: user.status,
            to: status,
            ...(reason ? { reason } : {}),
          },
        },
      });

      return { kind: "changed" as const, name: user.name, tenantId: user.tenantId };
    });

    if (outcome.kind === "missing") return fail("That user no longer exists.");
    if (outcome.kind === "invited") return fail("This account hasn't finished setting up.");

    if (outcome.kind === "unchanged") {
      return {
        status: "success",
        message: `${outcome.name} is already ${status === "ACTIVE" ? "active" : "suspended"}.`,
      };
    }

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/users");
    if (outcome.tenantId) revalidatePath(`/super-admin/companies/${outcome.tenantId}`);

    return {
      status: "success",
      message: `${outcome.name} is now ${status === "ACTIVE" ? "active" : "suspended"}.`,
    };
  } catch (error) {
    console.error("Failed to change user status:", error);
    return fail("Something went wrong. Please try again.");
  }
}