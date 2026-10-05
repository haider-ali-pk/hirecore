import type { CSSProperties } from "react";
import { Sparkles } from "lucide-react";
import ParticleField from "@/components/effects/ParticleField";
import Eyebrow from "@/components/ui/Eyebrow";
import GlowButton from "@/components/ui/GlowButton";
import styles from "./Hero.module.css";

const CAPABILITIES = [
  "AI screening",
  "Smart pipeline",
  "Interview copilot",
  "Candidate portal",
];

/** Staggers the entrance animation of each block. */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export default function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <ParticleField
        variant="ring"
        density={1.7}
        intensity={1.4}
        className={styles.field}
      />

      <div className={styles.content}>
        <div className={styles.reveal} style={delay(0)}>
          <Eyebrow icon={<Sparkles size={16} strokeWidth={2} />}>
            AI recruitment platform
          </Eyebrow>
        </div>

        <h1
          id="hero-title"
          className={`${styles.title} ${styles.reveal} text-fade`}
          style={delay(120)}
        >
          Intelligent hiring infrastructure for modern teams.
        </h1>

        <p className={`${styles.lead} ${styles.reveal}`} style={delay(240)}>
          <strong>HireCore</strong> screens every CV, ranks every candidate and keeps
          every stage moving, so your team spends its time on people, not paperwork.
        </p>

        <div className={`${styles.actions} ${styles.reveal}`} style={delay(360)}>
          <GlowButton href="/register" size="lg">
            Book a demo
          </GlowButton>
          <GlowButton href="/#platform" variant="ghost" size="lg">
            Explore the platform
          </GlowButton>
        </div>

        <ul
          className={`${styles.strip} ${styles.reveal}`}
          style={delay(480)}
          aria-label="Platform capabilities"
        >
          {CAPABILITIES.map((item) => (
            <li key={item} className={`${styles.stripItem} mono-label`}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}