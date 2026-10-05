import Eyebrow from "@/components/ui/Eyebrow";
import GlassCard from "@/components/ui/GlassCard";
import styles from "./Portals.module.css";

interface Portal {
  /** Anchor id. Must match the hash links in FloatingNav. */
  id: string;
  label: string;
  numeral: string;
  tilt: "left" | "right";
  description: string;
  features: string[];
}

const PORTALS: Portal[] = [
  {
    id: "recruiters",
    label: "Recruiter",
    numeral: "01",
    tilt: "left",
    description:
      "Run the whole pipeline from one board. AI screens and ranks every CV, so each day starts with a shortlist instead of an inbox.",
    features: ["CV ranking", "Kanban pipeline", "Recruiter agent"],
  },
  {
    id: "hiring-managers",
    label: "Hiring manager",
    numeral: "02",
    tilt: "right",
    description:
      "Review shortlists, leave structured feedback and approve offers without chasing anyone for an update.",
    features: ["Shortlist review", "Scorecards", "Approvals"],
  },
  {
    id: "candidates",
    label: "Candidate",
    numeral: "03",
    tilt: "left",
    description:
      "Apply once, see exactly where you stand, and practise interviews with instant AI feedback before the real thing.",
    features: ["Application tracking", "Mock interviews", "Profile and CV"],
  },
  {
    id: "companies",
    label: "Company admin",
    numeral: "04",
    tilt: "right",
    description:
      "Control teams, roles and billing with a full audit trail across every hiring workspace in your organisation.",
    features: ["Roles and access", "Audit log", "Usage insights"],
  },
];

export default function Portals() {
  return (
    <section id="portals" className={styles.section} aria-labelledby="portals-title">
      <div className="container">
        <header className={styles.header}>
          <Eyebrow>Built for every role</Eyebrow>
          <h2 id="portals-title" className={`${styles.title} text-fade`}>
            A portal for every person in the hiring loop.
          </h2>
          <p className={styles.lead}>
            Recruiters, hiring managers, candidates and admins each get a workspace
            designed around their job, all running on the same data.
          </p>
        </header>

        <div className={styles.grid}>
          {PORTALS.map((portal) => (
            <div key={portal.id} id={portal.id} className={styles.cell}>
              <GlassCard
                label={portal.label}
                numeral={portal.numeral}
                tilt={portal.tilt}
                interactive
              >
                <p>{portal.description}</p>
                <ul className={styles.features} aria-label={`${portal.label} features`}>
                  {portal.features.map((feature) => (
                    <li key={feature} className={`${styles.feature} mono-label`}>
                      {feature}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}