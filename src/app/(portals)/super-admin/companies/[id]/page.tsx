import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, ShieldCheck, Users } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import GlowButton from "@/components/ui/GlowButton";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { PLAN_LABEL, TENANT_STATUS_META } from "@/lib/tenants";
import { USER_STATUS_META } from "@/lib/users";
import styles from "./page.module.css";
import PlanForm from "./PlanForm";
import StatusControls from "./StatusControls";

export const metadata: Metadata = { title: "Company" };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("SUPER_ADMIN");

  const { id } = await params;
  if (id.length > 64) notFound();

  const now = new Date();

  const [company, pendingInvitations, members] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        plan: true,
        timezone: true,
        trialEndsAt: true,
        createdAt: true,
        _count: { select: { users: true } },
      },
    }),
    prisma.invitation.count({
      where: {
        tenantId: id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    }),
    prisma.user.findMany({
      where: { tenantId: id },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
      },
    }),
  ]);

  if (!company) notFound();

  const status = TENANT_STATUS_META[company.status];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Super admin"
        eyebrowIcon={<ShieldCheck size={16} strokeWidth={2} />}
        title={company.name}
        description={`Workspace /${company.slug}, created ${dateFormat.format(company.createdAt)}.`}
        actions={
          <GlowButton href="/super-admin/companies" variant="ghost">
            Back to companies
          </GlowButton>
        }
      />

      <section aria-label="Company totals" className={styles.stats}>
        <StatCard label="Users" value={company._count.users} icon={Users} />
        <StatCard label="Pending invitations" value={pendingInvitations} icon={Mail} />
      </section>

      <div className={styles.columns}>
        <section className={styles.panel} aria-labelledby="workspace-title">
          <div className={styles.panelHeader}>
            <h2 id="workspace-title" className={styles.panelTitle}>
              Workspace
            </h2>
          </div>

          <dl>
            <div className={styles.detail}>
              <dt className="mono-label">URL name</dt>
              <dd>{company.slug}</dd>
            </div>
            <div className={styles.detail}>
              <dt className="mono-label">Status</dt>
              <dd>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </dd>
            </div>
            <div className={styles.detail}>
              <dt className="mono-label">Plan</dt>
              <dd>{PLAN_LABEL[company.plan]}</dd>
            </div>
            {company.status === "TRIAL" && company.trialEndsAt && (
              <div className={styles.detail}>
                <dt className="mono-label">Trial ends</dt>
                <dd>
                  <time dateTime={company.trialEndsAt.toISOString()}>
                    {dateFormat.format(company.trialEndsAt)}
                  </time>
                </dd>
              </div>
            )}
            <div className={styles.detail}>
              <dt className="mono-label">Time zone</dt>
              <dd>{company.timezone}</dd>
            </div>
            <div className={styles.detail}>
              <dt className="mono-label">Created</dt>
              <dd>
                <time dateTime={company.createdAt.toISOString()}>
                  {dateFormat.format(company.createdAt)}
                </time>
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.panel} aria-labelledby="manage-title">
          <div className={styles.panelHeader}>
            <h2 id="manage-title" className={styles.panelTitle}>
              Manage
            </h2>
          </div>

          <div className={styles.manage}>
            <PlanForm tenantId={company.id} plan={company.plan} />
            <hr className={styles.rule} />
            <StatusControls
              tenantId={company.id}
              status={company.status}
              companyName={company.name}
            />
          </div>
        </section>
      </div>

      <section aria-labelledby="team-title">
        <h2 id="team-title" className={styles.sectionHeading}>
          Team
        </h2>

        {members.length === 0 ? (
          <p className={styles.empty}>
            No one has joined yet. Once the first admin accepts their invitation, they
            appear here.
          </p>
        ) : (
          <DataTable label="Team members">
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const memberStatus = USER_STATUS_META[member.status];
                return (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.name}</strong>
                      <small>{member.email}</small>
                    </td>
                    <td>{ROLE_LABEL[member.role]}</td>
                    <td>
                      <StatusBadge tone={memberStatus.tone}>
                        {memberStatus.label}
                      </StatusBadge>
                    </td>
                    <td>
                      {member.lastLoginAt ? (
                        <time dateTime={member.lastLoginAt.toISOString()}>
                          {dateTimeFormat.format(member.lastLoginAt)}
                        </time>
                      ) : (
                        "Never"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </section>
    </div>
  );
}