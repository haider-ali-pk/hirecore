"use client";

import { useActionState } from "react";
import { CircleAlert, Lock } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import GlowButton from "@/components/ui/GlowButton";
import TextField from "@/components/ui/TextField";
import { loginAction } from "./actions";
import type { LoginState } from "./actions";
import styles from "./LoginForm.module.css";

const INITIAL_STATE: LoginState = { status: "idle" };

interface LoginFormProps {
  /** Where to send the user after sign-in. Validated again on the server. */
  callbackUrl?: string;
}

export default function LoginForm({ callbackUrl }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);

  return (
    <section className={styles.card} aria-labelledby="login-title">
      <header className={styles.header}>
        <Eyebrow icon={<Lock size={16} strokeWidth={2} />}>Secure sign in</Eyebrow>
        <h1 id="login-title" className={`${styles.title} text-fade`}>
          Welcome back.
        </h1>
        <p className={styles.subtitle}>Sign in to continue to your workspace.</p>
      </header>

      <form action={formAction} className={styles.form}>
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

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
          autoComplete="email"
          placeholder="you@company.com"
          defaultValue={state.email ?? ""}
          required
        />

        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />

        <GlowButton type="submit" size="lg" loading={pending} className={styles.submit}>
          Sign in
        </GlowButton>
      </form>
    </section>
  );
}