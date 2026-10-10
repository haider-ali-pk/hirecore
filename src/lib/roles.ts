import type { User } from "@/generated/prisma/client";

/** Derived from the Prisma schema, so it can never drift from the database. */
export type Role = User["role"];

export const PORTAL_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/super-admin",
  COMPANY_ADMIN: "/company-admin",
  RECRUITER: "/recruiter",
  HIRING_MANAGER: "/hiring-manager",
  EMPLOYEE: "/employee",
  CANDIDATE: "/candidate",
};

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  COMPANY_ADMIN: "Company admin",
  RECRUITER: "Recruiter",
  HIRING_MANAGER: "Hiring manager",
  EMPLOYEE: "Employee",
  CANDIDATE: "Candidate",
};

/** Portals each role may open. Company admins can also use the recruiting workspace. */
const PORTAL_ACCESS: Record<Role, readonly Role[]> = {
  SUPER_ADMIN: ["SUPER_ADMIN"],
  COMPANY_ADMIN: ["COMPANY_ADMIN", "RECRUITER"],
  RECRUITER: ["RECRUITER"],
  HIRING_MANAGER: ["HIRING_MANAGER"],
  EMPLOYEE: ["EMPLOYEE"],
  CANDIDATE: ["CANDIDATE"],
};

export function canAccessPortal(role: Role, portal: Role): boolean {
  return PORTAL_ACCESS[role].includes(portal);
}

/** Where a signed-in user of this role lands. */
export function homeForRole(role: Role): string {
  return PORTAL_HOME[role];
}

/** The role that owns a pathname, or null when it isn't a portal path. */
export function roleForPath(pathname: string): Role | null {
  for (const [role, base] of Object.entries(PORTAL_HOME) as [Role, string][]) {
    if (pathname === base || pathname.startsWith(`${base}/`)) return role;
  }
  return null;
}