import { auditActionLabel, auditDetail } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import styles from "./CompanyActivity.module.css";

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

export default async function CompanyActivity({ tenantId }: { tenantId: string }) {
  const entries = await prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
      actor: { select: { name: true, email: true } },
    },
  });

  return (
    <section className={styles.panel} aria-labelledby="company-activity-title">
      <div className={styles.header}>
        <h2 id="company-activity-title" className={styles.title}>
          Activity
        </h2>
        <span className="mono-label">Times in UTC</span>
      </div>

      {entries.length === 0 ? (
        <p className={styles.empty}>Nothing has been recorded for this company yet.</p>
      ) : (
        <ul>
          {entries.map((entry) => {
            const detail = auditDetail(entry.action, entry.metadata);
            const who = entry.actor
              ? `${entry.actor.name} (${entry.actor.email})`
              : "System";

            return (
              <li key={entry.id} className={styles.row}>
                <div className={styles.main}>
                  <p className={styles.action}>{auditActionLabel(entry.action)}</p>
                  {detail && <p className={styles.detail}>{detail}</p>}
                  <p className={styles.meta}>{who}</p>
                </div>
                <time className={styles.time} dateTime={entry.createdAt.toISOString()}>
                  {timeFormat.format(entry.createdAt)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}