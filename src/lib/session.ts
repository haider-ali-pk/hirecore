import { cache } from "react";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { homeForRole } from "@/lib/roles";
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