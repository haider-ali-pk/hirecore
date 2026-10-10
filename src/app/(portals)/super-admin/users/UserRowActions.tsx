"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TextField from "@/components/ui/TextField";
import type { UserStatus } from "@/lib/users";
import { setUserStatusAction } from "./actions";
import type { UserStatusState } from "./actions";
import styles from "./UserRowActions.module.css";

const IDLE: UserStatusState = { status: "idle" };

interface UserRowActionsProps {
  userId: string;
  name: string;
  status: UserStatus;
  /** True for the signed-in Super Admin's own row. */
  isSelf: boolean;
}

export default function UserRowActions({
  userId,
  name,
  status,
  isSelf,
}: UserRowActionsProps) {
  const [state, formAction, pending] = useActionState(setUserStatusAction, IDLE);
  const [open, setOpen] = useState(false);
  // Marks the action result that was current when the dialog opened, so an
  // older error or success is not mistaken for the outcome of this attempt.
  const [baseline, setBaseline] = useState<UserStatusState>(IDLE);

  if (isSelf) return <span className={styles.note}>You</span>;
  if (status === "INVITED") return null;

  const isFresh = state !== baseline;

  if (status === "SUSPENDED") {
    return (
      <form action={formAction} className={styles.wrap}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="status" value="ACTIVE" />
        <button
          type="submit"
          className={clsx(styles.button, styles.primary)}
          disabled={pending}
        >
          Reactivate
        </button>
        {state.status === "error" && (
          <p role="alert" className={styles.error}>
            {state.message}
          </p>
        )}
      </form>
    );
  }

  const succeeded = isFresh && state.status === "success";

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={clsx(styles.button, styles.danger)}
        disabled={pending}
        onClick={() => {
          setBaseline(state);
          setOpen(true);
        }}
      >
        Suspend
      </button>

      <ConfirmDialog
        open={open && !succeeded}
        onClose={() => setOpen(false)}
        title={`Suspend ${name}?`}
        description="They won't be able to sign in, and if they are signed in now they are signed out within about five minutes. Their data stays, and you can reactivate them at any time."
        confirmLabel="Suspend account"
        tone="danger"
        action={formAction}
        pending={pending}
        error={isFresh && state.status === "error" ? state.message : null}
      >
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="status" value="SUSPENDED" />
        <TextField
          label="Reason (optional)"
          name="reason"
          maxLength={200}
          autoComplete="off"
          hint="Saved in the audit log."
        />
      </ConfirmDialog>
    </div>
  );
}