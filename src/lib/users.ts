import type { User } from "@/generated/prisma/client";
import type { BadgeTone } from "@/components/ui/StatusBadge";

export type UserStatus = User["status"];

export const USER_STATUS_META: Record<UserStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  INVITED: { label: "Invited", tone: "info" },
  SUSPENDED: { label: "Suspended", tone: "warning" },
};