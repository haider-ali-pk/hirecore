"use client";

import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import styles from "./TextField.module.css";

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "type" | "className"> {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "tel" | "url" | "search";
  /** Error text. Also marks the field invalid for assistive technology. */
  error?: string;
  /** Helper text shown when there is no error. */
  hint?: string;
  className?: string;
}

export default function TextField({
  label,
  name,
  type = "text",
  error,
  hint,
  className,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === "password";
  const messageId = error || hint ? `${id}-message` : undefined;

  return (
    <div className={clsx(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>

      <div className={clsx(styles.control, error && styles.invalid)}>
        <input
          {...rest}
          id={id}
          name={name}
          type={isPassword && revealed ? "text" : type}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
        />

        {isPassword && (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
          >
            {revealed ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {error ? (
        <p id={messageId} className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}