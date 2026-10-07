"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { PLAN_LABEL, PLAN_TIERS, TENANT_STATUS_META } from "@/lib/tenants";

export type ControlState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const idSchema = z.string().min(1).max(64);

const planSchema = z.object({
  tenantId: idSchema,
  plan: z.enum(PLAN_TIERS),
});

const statusSchema = z.object({
  tenantId: idSchema,
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED"]),
  reason: z.string().trim().max(200, "Keep the reason under 200 characters.").optional(),
});

function refresh(tenantId: string) {
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/companies");
  revalidatePath(`/super-admin/companies/${tenantId}`);
}

export async function updatePlanAction(
  _previous: ControlState,
  formData: FormData
): Promise<ControlState> {
  const actor = await requireRole("SUPER_ADMIN");

  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Choose a valid plan." };
  }

  const { tenantId, plan } = parsed.data;

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true },
      });

      if (!tenant) return { kind: "missing" as const };
      if (tenant.plan === plan) return { kind: "unchanged" as const };

      await tx.tenant.update({ where: { id: tenantId }, data: { plan } });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actor.id,
          action: "tenant.plan_changed",
          entityType: "Tenant",
          entityId: tenantId,
          metadata: { from: tenant.plan, to: plan },
        },
      });

      return { kind: "changed" as const };
    });

    if (outcome.kind === "missing") {
      return { status: "error", message: "That company no longer exists." };
    }

    if (outcome.kind === "unchanged") {
      return { status: "success", message: `Already on the ${PLAN_LABEL[plan]} plan.` };
    }

    refresh(tenantId);
    return { status: "success", message: `Plan changed to ${PLAN_LABEL[plan]}.` };
  } catch (error) {
    console.error("Failed to change plan:", error);
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}

export async function changeStatusAction(
  _previous: ControlState,
  formData: FormData
): Promise<ControlState> {
  const actor = await requireRole("SUPER_ADMIN");

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Choose a valid status.",
    };
  }

  const { tenantId, status } = parsed.data;
  const reason = parsed.data.reason || undefined;
  const label = TENANT_STATUS_META[status].label.toLowerCase();

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { status: true, name: true },
      });

      if (!tenant) return { kind: "missing" as const };
      if (tenant.status === status) {
        return { kind: "unchanged" as const, name: tenant.name };
      }

      await tx.tenant.update({
        where: { id: tenantId },
        data: { status, ...(status === "ACTIVE" ? { trialEndsAt: null } : {}) },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actor.id,
          action: "tenant.status_changed",
          entityType: "Tenant",
          entityId: tenantId,
          metadata: { from: tenant.status, to: status, ...(reason ? { reason } : {}) },
        },
      });

      return { kind: "changed" as const, name: tenant.name };
    });

    if (outcome.kind === "missing") {
      return { status: "error", message: "That company no longer exists." };
    }

    if (outcome.kind === "unchanged") {
      return { status: "success", message: `${outcome.name} is already ${label}.` };
    }

    refresh(tenantId);
    return { status: "success", message: `${outcome.name} is now ${label}.` };
  } catch (error) {
    console.error("Failed to change status:", error);
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}