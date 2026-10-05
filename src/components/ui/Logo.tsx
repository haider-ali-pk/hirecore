import Link from "next/link";
import clsx from "clsx";
import styles from "./Logo.module.css";

interface LogoProps {
  /** Link target. Pass `null` to render a non-interactive wordmark. */
  href?: string | null;
  /** `light` for dark backgrounds, `dark` for light/silver backgrounds. */
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Logo({
  href = "/",
  tone = "light",
  size = "md",
  className,
}: LogoProps) {
  const classes = clsx(styles.logo, styles[tone], styles[size], className);

  const mark = (
    <>
      <span>hirecore</span>
      <span className={styles.dot} aria-hidden="true">
        .
      </span>
    </>
  );

  if (href === null) {
    return <span className={classes}>{mark}</span>;
  }

  return (
    <Link href={href} className={classes} aria-label="HireCore home">
      {mark}
    </Link>
  );
}