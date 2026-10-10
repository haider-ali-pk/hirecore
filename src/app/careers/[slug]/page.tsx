import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import { EmptyState } from "@/components/ui/ListControls";
import { getPublicTenant } from "@/lib/careers";
import { EMPLOYMENT_LABEL, WORK_MODE_LABEL } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

export default async function CareersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getPublicTenant(slug);
  if (!tenant) notFound();

  const jobs = await prisma.job.findMany({
    where: { tenantId: tenant.id, status: "OPEN" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      location: true,
      employmentType: true,
      workMode: true,
    },
  });

  return (
    <>
      <section className={styles.hero}>
        <Eyebrow>We&apos;re hiring</Eyebrow>
        <h1 className={`${styles.title} text-fade`}>Join {tenant.name}.</h1>
        <p className={styles.lead}>
          Browse our open roles and apply in a few minutes.
        </p>
      </section>

      {jobs.length === 0 ? (
        <EmptyState
          title="No open roles right now"
          text="There are no open positions at the moment. Please check back soon."
        />
      ) : (
        <ul className={styles.list}>
          {jobs.map((job) => (
            <li key={job.id}>
              <Link href={`/careers/${tenant.slug}/jobs/${job.id}`} className={styles.card}>
                <span className={styles.cardMain}>
                  <span className={styles.cardTitle}>{job.title}</span>
                  <span className={styles.meta}>
                    <span className="mono-label">{job.location}</span>
                    <span className="mono-label">{EMPLOYMENT_LABEL[job.employmentType]}</span>
                    <span className="mono-label">{WORK_MODE_LABEL[job.workMode]}</span>
                  </span>
                </span>
                <ArrowUpRight size={22} className={styles.arrow} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}