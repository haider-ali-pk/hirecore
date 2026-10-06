import type { Metadata } from "next";
import { Building2, CircleCheck, ShieldCheck, UserRound, Users } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Overview" };

const ACTION_LABELS: Record<string, string> = {
  "user.created": "Account created",
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
};

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

const numberFormat = new Intl.NumberFormat("en-US");

export default async function SuperAdminOverviewPage() {
  await requireRole("SUPER_ADMIN");

  const [companies, liveWorkspaces, teamMembers, candidates, activity] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: { in: ["TRIAL", "ACTIVE"] } } }),
    prisma.user.count({ where: { role: { not: "CANDIDATE" } } }),
    prisma.user.count({ where: { role: "CANDIDATE" } }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
        tenant: { select: { name: true } },
      },
    }),
  ]);

  const stats = [
    { label: "Companies", value: companies, icon: Building2 },
    { label: "Live workspaces", value: liveWorkspaces, icon: CircleCheck },
    { label: "Team members", value: teamMembers, icon: Users },
    { label: "Candidates", value: candidates, icon: UserRound },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Eyebrow icon={<ShieldCheck size={16} strokeWidth={2} />}>Super admin</Eyebrow>
        <h1 className={styles.title}>Platform overview</h1>
        <p className={styles.subtitle}>
          Companies, people and activity across every workspace on HireCore.
        </p>
      </header>

      <section aria-label="Platform totals" className={styles.stats}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={styles.stat}>
              <div className={styles.statTop}>
                <span className="mono-label">{stat.label}</span>
                <span className={styles.statIcon} aria-hidden="true">
                  <Icon size={18} strokeWidth={2} />
                </span>
              </div>
              <p className={styles.statValue}>{numberFormat.format(stat.value)}</p>
            </div>
          );
        })}
      </section>

      <section className={styles.panel} aria-labelledby="activity-title">
        <div className={styles.panelHeader}>
          <h2 id="activity-title" className={styles.panelTitle}>
            Recent activity
          </h2>
          <span className="mono-label">Times in UTC</span>
        </div>

        {activity.length === 0 ? (
          <p className={styles.empty}>No activity has been recorded yet.</p>
        ) : (
          <ul>
            {activity.map((entry) => {
              const who = entry.actor
                ? `${entry.actor.name} (${entry.actor.email})`
                : "System";

              return (
                <li key={entry.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <p className={styles.rowTitle}>
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </p>
                    <p className={styles.rowMeta}>
                      {who}
                      {entry.tenant ? ` · ${entry.tenant.name}` : ""}
                    </p>
                  </div>
                  <time className={styles.rowTime} dateTime={entry.createdAt.toISOString()}>
                    {timeFormat.format(entry.createdAt)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}