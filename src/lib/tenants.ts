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