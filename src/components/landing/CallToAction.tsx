import ParticleField from "@/components/effects/ParticleField";
import Eyebrow from "@/components/ui/Eyebrow";
import GlowButton from "@/components/ui/GlowButton";
import styles from "./CallToAction.module.css";

export default function CallToAction() {
  return (
    <section className={styles.section} aria-labelledby="cta-title">
      <ParticleField
        variant="orbit"
        offsetY={0.05}
        density={1.3}
        intensity={1.3}
        className={styles.field}
      />

      <div className={styles.content}>
        <div className={styles.top}>
          <Eyebrow>Get started</Eyebrow>
          <h2 id="cta-title" className={`${styles.title} text-fade`}>
            Build a hiring process your team can trust.
          </h2>
        </div>

        <div className={styles.bottom}>
          <p className={styles.lead}>
            Tell us how you hire today. We&apos;ll show you how HireCore fits around
            it, from the first CV to the signed offer.
          </p>
          <div className={styles.actions}>
            <GlowButton href="/register" size="lg">
              Book a demo
            </GlowButton>
            <GlowButton href="/login" variant="ghost" size="lg">
              Sign in
            </GlowButton>
          </div>
        </div>
      </div>
    </section>
  );
}