"use client";

import { useActionState, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Check, CircleAlert, Copy, TriangleAlert } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import GlowButton from "@/components/ui/GlowButton";
import SelectField from "@/components/ui/SelectField";
import TextField from "@/components/ui/TextField";
import { slugify } from "@/lib/slug";
import { PLAN_LABEL, PLAN_TIERS, TRIAL_DAYS } from "@/lib/tenants";
import { createCompanyAction } from "./actions";
import type { CreateCompanyState } from "./actions";
import styles from "./NewCompanyForm.module.css";

const INITIAL_STATE: CreateCompanyState = { status: "idle" };

const PLAN_OPTIONS = PLAN_TIERS.map((tier) => ({
  value: tier,
  label: PLAN_LABEL[tier],
}));

const STATUS_OPTIONS = [
  { value: "TRIAL", label: `Trial (${TRIAL_DAYS} days)` },
  { value: "ACTIVE", label: "Active" },
];

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

interface NewCompanyFormProps {
  /** Passed from the server because the invitation helpers are server-only. */
  inviteTtlDays: number;
}

export default function NewCompanyForm({ inviteTtlDays }: NewCompanyFormProps) {
  const [state, formAction, pending] = useActionState(createCompanyAction, INITIAL_STATE);
  const [, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [dismissed, setDismissed] = useState<CreateCompanyState | null>(null);
  const [copied, setCopied] = useState(false);

  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  /* Submitted by hand so React does not reset the form after the action:
     every field keeps its value when the server reports an error. */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link stays selectable in the field.
    }
  };

  const startAnother = () => {
    setDismissed(state);
    setName("");
    setSlug("");
    setSlugEdited(false);
    setCopied(false);
  };

  if (state.status === "created" && state !== dismissed) {
    return (
      <section className={styles.card} aria-labelledby="created-title" role="status">
        <Eyebrow tone="accent" icon={<Check size={16} strokeWidth={2.4} />}>
          Company created
        </Eyebrow>

        <h2 id="created-title" className={`${styles.successTitle} text-fade`}>
          {state.companyName} is ready.
        </h2>

        <p className={styles.successText}>
          Send this link to <strong>{state.adminEmail}</strong>. They will set their own
          password and become the company admin.
        </p>

        <div className={styles.linkRow}>
          <input
            readOnly
            value={state.inviteUrl}
            className={styles.linkInput}
            aria-label="Invitation link"
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            type="button"
            className={styles.copyButton}
            onClick={() => copyLink(state.inviteUrl)}
          >
            {copied ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>

        <p className={styles.note}>
          <TriangleAlert size={18} aria-hidden="true" />
          <span>
            This link works once and expires on{" "}
            {dateFormat.format(new Date(state.expiresAt))}. It is shown only now, because
            only a hash of it is stored. If it is lost, create a new invitation.
          </span>
        </p>

        <div className={styles.actions}>
          <GlowButton href="/super-admin/companies">View companies</GlowButton>
          <GlowButton variant="ghost" onClick={startAnother}>
            Create another
          </GlowButton>
        </div>
      </section>
    );
  }

  return (
    <div className={styles.card}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {state.status === "error" && state.message && (
          <div className={styles.alert} role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{state.message}</span>
          </div>
        )}

        <fieldset className={styles.section} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="sr-only">Company</legend>
          <div className={styles.sectionHead} aria-hidden="true">
            <p className={styles.sectionTitle}>Company</p>
            <p className={styles.sectionText}>
              The workspace this company's team will sign in to.
            </p>
          </div>

          <div className={styles.grid}>
            <TextField
              label="Company name"
              name="companyName"
              autoComplete="organization"
              placeholder="Acme Recruitment"
              maxLength={80}
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugEdited) setSlug(slugify(event.target.value));
              }}
              error={fieldErrors.companyName}
            />

            <TextField
              label="URL name"
              name="slug"
              autoComplete="off"
              placeholder="acme-recruitment"
              maxLength={40}
              required
              value={slug}
              onChange={(event) => {
                const value = event.target.value.toLowerCase();
                setSlug(value);
                setSlugEdited(value !== "");
              }}
              error={fieldErrors.slug}
              hint="Used in the company's careers page address. Lowercase letters, numbers and hyphens."
            />

            <SelectField
              label="Plan"
              name="plan"
              options={PLAN_OPTIONS}
              defaultValue="STARTER"
              error={fieldErrors.plan}
            />

            <SelectField
              label="Starting status"
              name="status"
              options={STATUS_OPTIONS}
              defaultValue="TRIAL"
              error={fieldErrors.status}
            />
          </div>
        </fieldset>

        <hr className={styles.divider} />

        <fieldset className={styles.section} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="sr-only">First company admin</legend>
          <div className={styles.sectionHead} aria-hidden="true">
            <p className={styles.sectionTitle}>First company admin</p>
            <p className={styles.sectionText}>
              They get a single-use invitation link valid for {inviteTtlDays} days and
              choose their own password.
            </p>
          </div>

          <div className={styles.grid}>
            <TextField
              label="Full name"
              name="adminName"
              autoComplete="off"
              maxLength={80}
              required
              error={fieldErrors.adminName}
            />

            <TextField
              label="Email"
              name="adminEmail"
              type="email"
              autoComplete="off"
              placeholder="name@company.com"
              required
              error={fieldErrors.adminEmail}
            />
          </div>
        </fieldset>

        <div className={styles.actions}>
          <GlowButton type="submit" size="lg" loading={pending}>
            Create company
          </GlowButton>
        </div>
      </form>
    </div>
  );
}