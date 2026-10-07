import { prisma } from "@/lib/prisma";

export async function getTenantOverview(tenantId: string) {
  const now = new Date();

  const [tenant, teamMembers, departments, pendingInvitations] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        slug: true,
        status: true,
        plan: true,
        timezone: true,
        trialEndsAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where: { tenantId } }),
    prisma.department.count({ where: { tenantId } }),
    prisma.invitation.count({
      where: {
        tenantId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    }),
  ]);

  if (!tenant) return null;

  return { tenant, teamMembers, departments, pendingInvitations };
}