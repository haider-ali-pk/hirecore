import type { Tenant } from "@/generated/prisma/client";
import type { BadgeTone } from "@/components/ui/StatusBadge";

export type TenantStatus = Tenant["status"];
export type PlanTier = Tenant["plan"];

export const TENANT_STATUSES = [
  "TRIAL",
  "ACTIVE",
  "SUSPENDED",
  "CANCELLED",
] as const satisfies readonly TenantStatus[];

export const PLAN_TIERS = [
  "STARTER",
  "GROWTH",
  "ENTERPRISE",
] as const satisfies readonly PlanTier[];

/** Length of a new workspace's free trial. */
export const TRIAL_DAYS = 14;

export function trialEndFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export const TENANT_STATUS_META: Record<
  TenantStatus,
  { label: string; tone: BadgeTone }
> = {
  TRIAL: { label: "Trial", tone: "info" },
  ACTIVE: { label: "Active", tone: "success" },
  SUSPENDED: { label: "Suspended", tone: "warning" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
};

export const PLAN_LABEL: Record<PlanTier, string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  ENTERPRISE: "Enterprise",
};

export function isTenantStatus(value: unknown): value is TenantStatus {
  return (
    typeof value === "string" &&
    (TENANT_STATUSES as readonly string[]).includes(value)
  );
}