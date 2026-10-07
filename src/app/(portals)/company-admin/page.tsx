import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, Layers, Mail, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { requireTenantRole } from "@/lib/session";
import { getTenantOverview } from "@/lib/tenant-overview";
import { PLAN_LABEL, TENANT_STATUS_META } from "@/lib/tenants";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Overview" };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default async function CompanyOverviewPage() {
  const { tenantId } = await requireTenantRole("COMPANY_ADMIN");

  const overview = await getTenantOverview(tenantId);
  if (!overview) notFound();

  const { tenant, teamMembers, departments, pendingInvitations } = overview;
  const status = TENANT_STATUS_META[tenant.status];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Company admin"
        eyebrowIcon={<Building2 size={16} strokeWidth={2} />}
        title={tenant.name}
        description="Your workspace at a glance: team, plan and status."
      />

      <section aria-label="Workspace totals" className={styles.stats}>
        <StatCard label="Team members" value={teamMembers} icon={Users} />
        <StatCard label="Pending invitations" value={pendingInvitations} icon={Mail} />
        <StatCard label="Departments" value={departments} icon={Layers} />
      </section>

      <section className={styles.panel} aria-labelledby="workspace-title">
        <div className={styles.panelHeader}>
          <h2 id="workspace-title" className={styles.panelTitle}>
            Workspace
          </h2>
        </div>

        <dl>
          <div className={styles.detail}>
            <dt className="mono-label">Plan</dt>
            <dd>{PLAN_LABEL[tenant.plan]}</dd>
          </div>
          <div className={styles.detail}>
            <dt className="mono-label">Status</dt>
            <dd>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </dd>
          </div>
          {tenant.status === "TRIAL" && tenant.trialEndsAt && (
            <div className={styles.detail}>
              <dt className="mono-label">Trial ends</dt>
              <dd>
                <time dateTime={tenant.trialEndsAt.toISOString()}>
                  {dateFormat.format(tenant.trialEndsAt)}
                </time>
              </dd>
            </div>
          )}
          <div className={styles.detail}>
            <dt className="mono-label">Time zone</dt>
            <dd>{tenant.timezone}</dd>
          </div>
          <div className={styles.detail}>
            <dt className="mono-label">Created</dt>
            <dd>
              <time dateTime={tenant.createdAt.toISOString()}>
                {dateFormat.format(tenant.createdAt)}
              </time>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}