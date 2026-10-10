import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicJob } from "@/lib/careers";
import { EMPLOYMENT_LABEL, WORK_MODE_LABEL } from "@/lib/jobs";
import styles from "./page.module.css";

type Params = Promise<{ slug: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, id } = await params;
  const job = await getPublicJob(slug, id);
  return job ? { title: `${job.title} at ${job.tenant.name}` } : {};
}

export default async function PublicJobPage({ params }: { params: Params }) {
  const { slug, id } = await params;
  const job = await getPublicJob(slug, id);
  if (!job) notFound();

  return (
    <article>
      <Link href={`/careers/${job.tenant.slug}`} className={styles.back}>
        ← All roles
      </Link>

      <header className={styles.header}>
        <h1 className={`${styles.title} text-fade`}>{job.title}</h1>
        <div className={styles.meta}>
          <span className="mono-label">{job.location}</span>
          <span className="mono-label">{EMPLOYMENT_LABEL[job.employmentType]}</span>
          <span className="mono-label">{WORK_MODE_LABEL[job.workMode]}</span>
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>About the role</h2>
        <p className={styles.prose}>{job.description}</p>
      </section>

      {job.requirements && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Requirements</h2>
          <p className={styles.prose}>{job.requirements}</p>
        </section>
      )}
    </article>
  );
}