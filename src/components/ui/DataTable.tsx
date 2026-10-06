import type { ReactNode } from "react";
import styles from "./DataTable.module.css";

interface DataTableProps {
  /** Accessible name for the table region, e.g. "Companies". */
  label: string;
  /** `<thead>` and `<tbody>` markup. */
  children: ReactNode;
}

export default function DataTable({ label, children }: DataTableProps) {
  return (
    <div className={styles.wrap} role="region" aria-label={label} tabIndex={0}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}