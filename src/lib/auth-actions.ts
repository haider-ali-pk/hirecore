"use server";

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function signOutAction(): Promise<void> {
  const session = await auth();

  if (session?.user) {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: session.user.tenant_id,
          actorId: session.user.id,
          action: "auth.logout",
          entityType: "User",
          entityId: session.user.id,
        },
      });
    } catch (error) {
      // Bookkeeping must never block signing out.
      console.error("Failed to record logout:", error);
    }
  }

  await signOut({ redirectTo: "/login" });
}