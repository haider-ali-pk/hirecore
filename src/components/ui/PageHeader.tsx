import type { ReactNode } from "react";
import Eyebrow from "@/components/ui/Eyebrow";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  /** Icon for the eyebrow pill. Leave out for the default icon. */
  eyebrowIcon?: ReactNode;
  /** Buttons or links shown on the right. */
  actions?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  eyebrow,
  eyebrowIcon,
  actions,
}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {eyebrow && <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>}
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}