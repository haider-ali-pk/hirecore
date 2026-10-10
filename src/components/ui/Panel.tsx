import type { ReactNode } from "react";
import styles from "./Panel.module.css";

interface PanelProps {
  title: string;
  /** Small text on the right of the header, e.g. "Times in UTC". */
  meta?: string;
  /** Skip the inner padding, for tables and detail lists. */
  flush?: boolean;
  children: ReactNode;
}

export function Panel({ title, meta, flush = false, children }: PanelProps) {
  const id = `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <section className={styles.panel} aria-labelledby={id}>
      <div className={styles.header}>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        {meta && <span className="mono-label">{meta}</span>}
      </div>
      {flush ? children : <div className={styles.body}>{children}</div>}
    </section>
  );
}

export function DetailList({ children }: { children: ReactNode }) {
  return <dl>{children}</dl>;
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.detail}>
      <dt className="mono-label">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}