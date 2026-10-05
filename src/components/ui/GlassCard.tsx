import clsx from "clsx";
import type { ElementType, ReactNode } from "react";
import styles from "./GlassCard.module.css";

interface GlassCardProps {
  children?: ReactNode;
  /** Small uppercase label at the top, e.g. "Recruiter". */
  label?: string;
  /** Large lime numeral, e.g. "01". Decorative, hidden from screen readers. */
  numeral?: string;
  variant?: "default" | "glass";
  /** Perspective skew. Levels out on hover when `interactive` is true. */
  tilt?: "none" | "left" | "right";
  /** Lift and level the card on hover. */
  interactive?: boolean;
  compact?: boolean;
  /** Rendered element. Defaults to a div. */
  as?: ElementType;
  className?: string;
}

export default function GlassCard({
  children,
  label,
  numeral,
  variant = "default",
  tilt = "none",
  interactive = false,
  compact = false,
  as,
  className,
}: GlassCardProps) {
  const Tag: ElementType = as ?? "div";
  const tiltClass =
    tilt === "left" ? styles.tiltLeft : tilt === "right" ? styles.tiltRight : undefined;

  return (
    <Tag
      className={clsx(
        styles.card,
        styles[variant],
        tiltClass,
        interactive && styles.interactive,
        compact && styles.compact,
        className
      )}
    >
      {label && <p className={styles.label}>{label}</p>}
      {numeral && (
        <p className={styles.numeral} aria-hidden="true">
          {numeral}
        </p>
      )}
      {children && <div className={styles.body}>{children}</div>}
    </Tag>
  );
}