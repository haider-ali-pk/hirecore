import type { ReactNode } from "react";
import ParticleField from "@/components/effects/ParticleField";
import Logo from "@/components/ui/Logo";
import styles from "./layout.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <ParticleField
        variant="ring"
        density={1.2}
        intensity={1.1}
        zoom={0.95}
        className={styles.field}
      />

      <header className={styles.header}>
        <Logo />
      </header>

      <main id="main" className={styles.main}>
        {children}
      </main>
    </div>
  );
}