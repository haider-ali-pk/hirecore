import { INVITE_TTL_DAYS, inviteState } from "@/lib/invitations";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/roles";
import InvitationManager from "./InvitationManager";
import type { InvitationRow } from "./InvitationManager";

export default async function InvitationsSection({ tenantId }: { tenantId: string }) {
  const rows = await prisma.invitation.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      invitedBy: { select: { name: true } },
    },
  });

  const now = new Date();

  const invitations: InvitationRow[] = rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    roleLabel: ROLE_LABEL[row.role],
    state: inviteState(row, now),
    invitedBy: row.invitedBy?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  }));

  return (
    <InvitationManager
      tenantId={tenantId}
      invitations={invitations}
      inviteTtlDays={INVITE_TTL_DAYS}
    />
  );
}