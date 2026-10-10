import type { ReactNode } from "react";
import styles from "./PageStack.module.css";

/** Vertical rhythm for a portal page. */
export default function PageStack({ children }: { children: ReactNode }) {
  return <div className={styles.stack}>{children}</div>;
}