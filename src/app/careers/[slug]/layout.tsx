import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getPublicTenant } from "@/lib/careers";
import styles from "./layout.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getPublicTenant(slug);
  return tenant ? { title: `Careers at ${tenant.name}` } : {};
}

export default async function CareersLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getPublicTenant(slug);
  if (!tenant) notFound();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href={`/careers/${tenant.slug}`} className={styles.brand}>
          {tenant.name}
        </Link>
        <span className="mono-label">Careers</span>
      </header>

      <main id="main" className={styles.main}>
        {children}
      </main>

      <footer className={styles.footer}>
        Powered by <Link href="/">HireCore</Link>
      </footer>
    </div>
  );
}