import type { User } from "@/generated/prisma/client";
import type { BadgeTone } from "@/components/ui/StatusBadge";
import { ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/lib/roles";

export type UserStatus = User["status"];

export const USER_STATUSES = [
  "ACTIVE",
  "INVITED",
  "SUSPENDED",
] as const satisfies readonly UserStatus[];

export const USER_STATUS_META: Record<UserStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  INVITED: { label: "Invited", tone: "info" },
  SUSPENDED: { label: "Suspended", tone: "warning" },
};

/** Every role. ROLE_LABEL is a Record<Role, ...>, so this can't drift from the schema. */
export const ALL_ROLES = Object.keys(ROLE_LABEL) as Role[];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ALL_ROLES as string[]).includes(value);
}

export function isUserStatus(value: unknown): value is UserStatus {
  return (
    typeof value === "string" && (USER_STATUSES as readonly string[]).includes(value)
  );
}