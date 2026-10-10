import { PORTAL_HOME } from "@/lib/roles";
import type { Role } from "@/lib/roles";

export type IconKey =
  | "overview"
  | "tenants"
  | "users"
  | "plans"
  | "audit"
  | "settings"
  | "jobs"
  | "pipeline";

export interface NavItem {
  label: string;
  href: string;
  icon: IconKey;
}

const overview = (role: Role): NavItem => ({
  label: "Overview",
  href: PORTAL_HOME[role],
  icon: "overview",
});

const jobs: NavItem = { label: "Jobs", href: "/recruiter/jobs", icon: "jobs" };

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    overview("SUPER_ADMIN"),
    { label: "Companies", href: "/super-admin/companies", icon: "tenants" },
    { label: "Users", href: "/super-admin/users", icon: "users" },
  ],
  COMPANY_ADMIN: [overview("COMPANY_ADMIN"), jobs],
  RECRUITER: [overview("RECRUITER"), jobs],
  HIRING_MANAGER: [overview("HIRING_MANAGER")],
  EMPLOYEE: [overview("EMPLOYEE")],
  CANDIDATE: [overview("CANDIDATE")],
};