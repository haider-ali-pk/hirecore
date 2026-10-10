import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GlowButton from "@/components/ui/GlowButton";
import PageHeader from "@/components/ui/PageHeader";
import PageStack from "@/components/ui/PageStack";
import { DetailList, DetailRow, Panel } from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import { EMPLOYMENT_LABEL, JOB_STATUS_META, WORK_MODE_LABEL } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { requireTenantPortal } from "@/lib/session";
import { updateJobAction } from "../actions";
import JobForm from "../JobForm";
import JobStatusControls from "../JobStatusControls";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Job" };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { tenantId } = await requireTenantPortal("RECRUITER");

  const { id } = await params;
  if (id.length > 64) notFound();

  const job = await prisma.job.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      title: true,
      location: true,
      employmentType: true,
      workMode: true,
      description: true,
      requirements: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      tenant: { select: { slug: true } },
      _count: { select: { applications: true } },
    },
  });

  if (!job) notFound();

  const status = JOB_STATUS_META[job.status];
  const publicPath = `/careers/${job.tenant.slug}/jobs/${job.id}`;

  return (
    <PageStack>
      <PageHeader
        eyebrow="Recruiting"
        title={job.title}
        description={`${job.location} · ${EMPLOYMENT_LABEL[job.employmentType]} · ${WORK_MODE_LABEL[job.workMode]}`}
        actions={
          <GlowButton href="/recruiter/jobs" variant="ghost">
            Back to jobs
          </GlowButton>
        }
      />

      <div className={styles.columns}>
        <Panel title="Details">
          <JobForm mode="edit" action={updateJobAction} job={job} />
        </Panel>

        <div className={styles.side}>
          <Panel title="Status">
            <JobStatusControls jobId={job.id} status={job.status} title={job.title} />
          </Panel>

          <Panel title="Overview" flush>
            <DetailList>
              <DetailRow label="Status">
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </DetailRow>
              <DetailRow label="Applications">{job._count.applications}</DetailRow>
              <DetailRow label="Created">
                <time dateTime={job.createdAt.toISOString()}>
                  {dateFormat.format(job.createdAt)}
                </time>
              </DetailRow>
              {job.publishedAt && (
                <DetailRow label="Published">
                  <time dateTime={job.publishedAt.toISOString()}>
                    {dateFormat.format(job.publishedAt)}
                  </time>
                </DetailRow>
              )}
              {job.status === "OPEN" && (
                <DetailRow label="Public page">
                  <Link href={publicPath} className={styles.publicLink} target="_blank">
                    {publicPath}
                  </Link>
                </DetailRow>
              )}
            </DetailList>
          </Panel>
        </div>
      </div>
    </PageStack>
  );
}