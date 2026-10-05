import clsx from "clsx";
import { Layers } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./Eyebrow.module.css";

interface EyebrowProps {
  children: ReactNode;
  /** Custom icon. Pass `null` to hide the icon. Defaults to a layers icon. */
  icon?: ReactNode;
  tone?: "neutral" | "accent";
  className?: string;
}

export default function Eyebrow({
  children,
  icon,
  tone = "neutral",
  className,
}: EyebrowProps) {
  return (
    <span className={clsx(styles.eyebrow, tone === "accent" && styles.accent, className)}>
      {icon !== null && (
        <span className={styles.icon} aria-hidden="true">
          {icon ?? <Layers size={16} strokeWidth={2} />}
        </span>
      )}
      {children}
    </span>
  );
}