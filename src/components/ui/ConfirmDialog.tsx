"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import clsx from "clsx";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  open: boolean;
  /** Called whenever the dialog closes, including Escape and backdrop clicks. */
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  /** Form action, usually the `formAction` from useActionState. */
  action: (formData: FormData) => void;
  pending?: boolean;
  error?: string | null;
  /** Hidden inputs and extra fields, rendered inside the form. */
  children?: ReactNode;
}

export default function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = "Keep as is",
  tone = "danger",
  action,
  pending = false,
  error,
  children,
}: ConfirmDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop targets the dialog element itself.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <form action={action} className={styles.form}>
        <h3 id={titleId} className={styles.title}>
          {title}
        </h3>
        <p className={styles.description}>{description}</p>

        {children}

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            onClick={() => dialogRef.current?.close()}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className={clsx(
              styles.button,
              tone === "danger" ? styles.danger : styles.primary
            )}
            disabled={pending}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}