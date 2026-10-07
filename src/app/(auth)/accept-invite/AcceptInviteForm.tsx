"use client";

import { useActionState } from "react";
import { CircleAlert, UserPlus } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import GlowButton from "@/components/ui/GlowButton";
import TextField from "@/components/ui/TextField";
import { PASSWORD_MIN_LENGTH } from "@/lib/password";
import { acceptInviteAction } from "./actions";
import type { AcceptInviteState } from "./actions";
import styles from "./AcceptInvite.module.css";

const INITIAL_STATE: AcceptInviteState = { status: "idle" };

interface AcceptInviteFormProps {
  token: string;
  companyName: string;
  roleLabel: string;
  email: string;
  defaultName: string;
}

export default function AcceptInviteForm({
  token,
  companyName,
  roleLabel,
  email,
  defaultName,
}: AcceptInviteFormProps) {
  const [state, formAction, pending] = useActionState(acceptInviteAction, INITIAL_STATE);

  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const nameValue = state.status === "error" ? (state.name ?? defaultName) : defaultName;

  return (
    <section className={styles.card} aria-labelledby="invite-title">
      <header className={styles.header}>
        <Eyebrow icon={<UserPlus size={16} strokeWidth={2} />}>You&apos;re invited</Eyebrow>
        <h1 id="invite-title" className={`${styles.title} text-fade`}>
          Join {companyName}.
        </h1>
        <p className={styles.subtitle}>
          You&apos;re joining as {roleLabel}. Choose a password to finish setting up your
          account.
        </p>
      </header>

      <form action={formAction} className={styles.form}>
        <input type="hidden" name="token" value={token} />

        {state.status === "error" && state.message && (
          <div className={styles.alert} role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{state.message}</span>
          </div>
        )}

        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={email}
          readOnly
        />

        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          defaultValue={nameValue}
          maxLength={80}
          required
          error={fieldErrors.name}
        />

        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters. A memorable phrase works well.`}
          error={fieldErrors.password}
        />

        <TextField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={fieldErrors.confirmPassword}
        />

        <GlowButton type="submit" size="lg" loading={pending} className={styles.submit}>
          Create account
        </GlowButton>
      </form>
    </section>
  );
}