"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import StatusBadge from "@/components/ui/StatusBadge";
import TextField from "@/components/ui/TextField";
import { TENANT_STATUS_META } from "@/lib/tenants";
import type { TenantStatus } from "@/lib/tenants";
import { changeStatusAction } from "./actions";
import type { ControlState } from "./actions";
import styles from "./CompanyControls.module.css";

type Target = "ACTIVE" | "SUSPENDED" | "CANCELLED";

interface ActionDef {
  target: Target;
  label: string;
  tone: "primary" | "danger";
  confirm: { verb: string; body: string; submit: string } | null;
}

const activate = (label: string): ActionDef => ({
  target: "ACTIVE",
  label,
  tone: "primary",
  confirm: null,
});

const SUSPEND: ActionDef = {
  target: "SUSPENDED",
  label: "Suspend",
  tone: "danger",
  confirm: {
    verb: "Suspend",
    body: "Nobody in this company will be able to sign in, and people who are signed in are signed out within about five minutes. Invitations can't be accepted while it's suspended. No data is deleted, and you can reactivate it at any time.",
    submit: "Suspend company",
  },
};

const CANCEL: ActionDef = {
  target: "CANCELLED",
  label: "Cancel company",
  tone: "danger",
  confirm: {
    verb: "Cancel",
    body: "The workspace is closed: nobody can sign in and invitations can't be accepted. No data is deleted, and you can reactivate it later.",
    submit: "Cancel company",
  },
};

const ACTIONS_BY_STATUS: Record<TenantStatus, ActionDef[]> = {
  TRIAL: [activate("Activate"), SUSPEND, CANCEL],
  ACTIVE: [SUSPEND, CANCEL],
  SUSPENDED: [activate("Reactivate"), CANCEL],
  CANCELLED: [activate("Reactivate")],
};

const INITIAL_STATE: ControlState = { status: "idle" };

interface StatusControlsProps {
  tenantId: string;
  status: TenantStatus;
  companyName: string;
}

export default function StatusControls({
  tenantId,
  status,
  companyName,
}: StatusControlsProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [state, formAction, pending] = useActionState(changeStatusAction, INITIAL_STATE);
  const [pendingAction, setPendingAction] = useState<ActionDef | null>(null);
  // Lets the dialog ignore an error left over from an earlier attempt.
  const [baseline, setBaseline] = useState<ControlState>(INITIAL_STATE);

  useEffect(() => {
    if (state.status === "success") dialogRef.current?.close();
  }, [state]);

  const openConfirm = (action: ActionDef) => {
    setPendingAction(action);
    setBaseline(state);
    dialogRef.current?.showModal();
  };

  const meta = TENANT_STATUS_META[status];
  const dialogError =
    pendingAction && state !== baseline && state.status === "error"
      ? state.message
      : null;

  return (
    <div className={styles.group}>
      <div className={styles.groupHead}>
        <span className="mono-label">Status</span>
        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
      </div>

      <div className={styles.actions}>
        {ACTIONS_BY_STATUS[status].map((action) =>
          action.confirm ? (
            <button
              key={action.target}
              type="button"
              className={clsx(
                styles.action,
                action.tone === "danger" && styles.actionDanger
              )}
              disabled={pending}
              onClick={() => openConfirm(action)}
            >
              {action.label}
            </button>
          ) : (
            <form key={action.target} action={formAction}>
              <input type="hidden" name="tenantId" value={tenantId} />
              <input type="hidden" name="status" value={action.target} />
              <button
                type="submit"
                className={clsx(styles.action, styles.actionPrimary)}
                disabled={pending}
              >
                {action.label}
              </button>
            </form>
          )
        )}
      </div>

      {!pendingAction && state.status !== "idle" && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={clsx(
            styles.message,
            state.status === "error" ? styles.messageError : styles.messageSuccess
          )}
        >
          {state.message}
        </p>
      )}

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClose={() => setPendingAction(null)}
        onClick={(event) => {
          // A click on the backdrop targets the dialog element itself.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        {pendingAction?.confirm && (
          <form action={formAction} className={styles.dialogForm}>
            <h3 id={titleId} className={styles.dialogTitle}>
              {pendingAction.confirm.verb} {companyName}?
            </h3>
            <p className={styles.dialogText}>{pendingAction.confirm.body}</p>

            <input type="hidden" name="tenantId" value={tenantId} />
            <input type="hidden" name="status" value={pendingAction.target} />

            <TextField
              label="Reason (optional)"
              name="reason"
              maxLength={200}
              autoComplete="off"
              hint="Saved in the audit log."
            />

            {dialogError && (
              <p role="alert" className={clsx(styles.message, styles.messageError)}>
                {dialogError}
              </p>
            )}

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.action}
                onClick={() => dialogRef.current?.close()}
              >
                Keep as is
              </button>
              <button
                type="submit"
                className={clsx(styles.action, styles.actionDanger)}
                disabled={pending}
              >
                {pendingAction.confirm.submit}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}