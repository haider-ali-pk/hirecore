import Link from "next/link";
import clsx from "clsx";
import { ArrowUpRight } from "lucide-react";
import type { MouseEventHandler, ReactNode } from "react";
import styles from "./GlowButton.module.css";

type Variant = "primary" | "solid" | "ghost";
type Size = "sm" | "md" | "lg";

interface BaseProps {
  variant?: Variant;
  size?: Size;
  /** Show the circular arrow chip. Defaults to true except for the ghost variant. */
  arrow?: boolean;
  /** Shows a spinner and blocks interaction. */
  loading?: boolean;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}

interface ButtonProps extends BaseProps {
  href?: undefined;
  external?: undefined;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

interface LinkProps extends BaseProps {
  href: string;
  /** Opens in a new tab with a safe rel attribute. */
  external?: boolean;
  type?: undefined;
  disabled?: undefined;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export type GlowButtonProps = ButtonProps | LinkProps;

export default function GlowButton(props: GlowButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    className,
    children,
  } = props;
  const arrow = props.arrow ?? variant !== "ghost";
  const ariaLabel = props["aria-label"];

  const classes = clsx(
    styles.button,
    styles[variant],
    styles[size],
    arrow && styles.withArrow,
    className
  );

  const content = (
    <>
      <span className={styles.label}>{children}</span>
      {arrow && (
        <span className={styles.chip} aria-hidden="true">
          {loading ? (
            <span className={styles.spinner} />
          ) : (
            <ArrowUpRight size={15} strokeWidth={2.2} />
          )}
        </span>
      )}
      {!arrow && loading && <span className={styles.spinner} aria-hidden="true" />}
    </>
  );

  if (props.href !== undefined) {
    const { href, external, onClick } = props;

    if (external) {
      return (
        <a
          href={href}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
          aria-busy={loading || undefined}
          onClick={onClick}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        href={href}
        className={classes}
        aria-label={ariaLabel}
        aria-busy={loading || undefined}
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  const { type = "button", disabled, onClick } = props;

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {content}
    </button>
  );
}