import type { Metadata } from "next";
import { Briefcase, FileText, UserPlus, Users } from "lucide-react";
import GlowButton from "@/components/ui/GlowButton";
import PageHeader from "@/components/ui/PageHeader";
import PageStack from "@/components/ui/PageStack";
import StatCard from "@/components/ui/StatCard";
import { prisma } from "@/lib/prisma";
import { requireTenantPortal } from "@/lib/session";

export const metadata: Metadata = { title: "Recruiting" };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function RecruiterOverviewPage() {
  const { tenantId } = await requireTenantPortal("RECRUITER");
  const weekAgo = new Date(Date.now() - WEEK_MS);

  const [openJobs, draftJobs, applications, newApplications] = await Promise.all([
    prisma.job.count({ where: { tenantId, status: "OPEN" } }),
    prisma.job.count({ where: { tenantId, status: "DRAFT" } }),
    prisma.application.count({ where: { tenantId } }),
    prisma.application.count({ where: { tenantId, createdAt: { gte: weekAgo } } }),
  ]);

  return (
    <PageStack>
      <PageHeader
        eyebrow="Recruiting"
        title="Recruiting overview"
        description="Your open roles and incoming applications."
        actions={<GlowButton href="/recruiter/jobs/new">New job</GlowButton>}
      />

      <section
        aria-label="Recruiting totals"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        <StatCard label="Open jobs" value={openJobs} icon={Briefcase} />
        <StatCard label="Draft jobs" value={draftJobs} icon={FileText} />
        <StatCard label="Applications" value={applications} icon={Users} />
        <StatCard label="New this week" value={newApplications} icon={UserPlus} />
      </section>
    </PageStack>
  );
}