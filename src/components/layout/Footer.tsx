import Link from "next/link";
import Logo from "@/components/ui/Logo";
import styles from "./Footer.module.css";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

/* Hash links match the section ids on the landing page. */
const COLUMNS: FooterColumn[] = [
  {
    heading: "Platform",
    links: [
      { label: "AI screening", href: "/#ai-screening" },
      { label: "Pipeline", href: "/#pipeline" },
      { label: "Interviews", href: "/#interviews" },
      { label: "Analytics", href: "/#analytics" },
    ],
  },
  {
    heading: "Who it's for",
    links: [
      { label: "Recruiters", href: "/#recruiters" },
      { label: "Hiring managers", href: "/#hiring-managers" },
      { label: "Candidates", href: "/#candidates" },
      { label: "Companies", href: "/#companies" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { label: "Book a demo", href: "/register" },
      { label: "Sign in", href: "/login" },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.brand}>
            <Logo />
            <p className={styles.tagline}>
              AI-powered recruitment and HR infrastructure for modern teams.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav
              key={column.heading}
              className={styles.column}
              aria-label={column.heading}
            >
              <p className={`${styles.heading} mono-label`}>{column.heading}</p>
              <ul className={styles.links}>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={styles.link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className={styles.legal}>
          <p className={styles.copy}>&copy; {year} HireCore. All rights reserved.</p>
          <p className="mono-label">AI recruitment platform</p>
        </div>
      </div>
    </footer>
  );
}