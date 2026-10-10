import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { canAccessPortal, homeForRole } from "@/lib/roles";
import type { Role } from "@/lib/roles";

export type SessionUser = Session["user"];

/** The signed-in user, or a redirect to /login. Deduplicated per request. */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
});

/** The signed-in user if they hold `role`; anyone else goes to their own portal. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) redirect(homeForRole(user.role));
  return user;
}

/**
 * For tenant portals: the signed-in user plus the tenant they belong to.
 * Every query in a tenant portal must be scoped by the returned tenantId.
 */
export async function requireTenantRole(
  role: Role
): Promise<{ user: SessionUser; tenantId: string }> {
  const user = await requireRole(role);
  if (!user.tenant_id) notFound();
  return { user, tenantId: user.tenant_id };
}

/**
 * Like requireTenantRole, but accepts any role allowed into `portal`
 * (e.g. company admins in the recruiting workspace).
 */
export async function requireTenantPortal(
  portal: Role
): Promise<{ user: SessionUser; tenantId: string }> {
  const user = await requireUser();
  if (!canAccessPortal(user.role, portal)) redirect(homeForRole(user.role));
  if (!user.tenant_id) notFound();
  return { user, tenantId: user.tenant_id };
}