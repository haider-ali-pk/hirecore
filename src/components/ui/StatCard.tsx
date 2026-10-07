import type { LucideIcon } from "lucide-react";
import styles from "./StatCard.module.css";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
}

const numberFormat = new Intl.NumberFormat("en-US");

export default function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className="mono-label">{label}</span>
        <span className={styles.icon} aria-hidden="true">
          <Icon size={18} strokeWidth={2} />
        </span>
      </div>
      <p className={styles.value}>
        {typeof value === "number" ? numberFormat.format(value) : value}
      </p>
    </div>
  );
}