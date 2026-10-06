import type { ReactNode } from "react";
import clsx from "clsx";
import styles from "./StatusBadge.module.css";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

export default function StatusBadge({ tone = "neutral", children }: StatusBadgeProps) {
  return (
    <span className={clsx(styles.badge, styles[tone])}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  );
}