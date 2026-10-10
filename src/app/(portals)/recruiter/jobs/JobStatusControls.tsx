"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { JobStatus } from "@/lib/jobs";
import { setJobStatusAction } from "./actions";
import type { JobStatusState } from "./actions";
import styles from "./JobStatusControls.module.css";

const IDLE: JobStatusState = { status: "idle" };

interface ActionDef {
  target: JobStatus;
  label: string;
  tone: "primary" | "neutral" | "danger";
  confirm?: boolean;
}

const CLOSE: ActionDef = { target: "CLOSED", label: "Close job", tone: "danger", confirm: true };

const ACTIONS: Record<JobStatus, ActionDef[]> = {
  DRAFT: [{ target: "OPEN", label: "Publish", tone: "primary" }, CLOSE],
  OPEN: [{ target: "PAUSED", label: "Pause", tone: "neutral" }, CLOSE],
  PAUSED: [{ target: "OPEN", label: "Resume", tone: "primary" }, CLOSE],
  CLOSED: [{ target: "OPEN", label: "Reopen", tone: "primary" }],
};

interface JobStatusControlsProps {
  jobId: string;
  status: JobStatus;
  title: string;
}

export default function JobStatusControls({ jobId, status, title }: JobStatusControlsProps) {
  const [state, formAction, pending] = useActionState(setJobStatusAction, IDLE);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The action result that was current when the dialog opened.
  const [baseline, setBaseline] = useState<JobStatusState>(IDLE);

  const isFresh = state !== baseline;
  const succeeded = isFresh && state.status === "success";

  return (
    <div className={styles.group}>
      <div className={styles.actions}>
        {ACTIONS[status].map((action) =>
          action.confirm ? (
            <button
              key={action.target}
              type="button"
              className={clsx(styles.button, styles.danger)}
              disabled={pending}
              onClick={() => {
                setBaseline(state);
                setConfirmOpen(true);
              }}
            >
              {action.label}
            </button>
          ) : (
            <form key={action.target} action={formAction}>
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="status" value={action.target} />
              <button
                type="submit"
                className={clsx(styles.button, action.tone === "primary" && styles.primary)}
                disabled={pending}
              >
                {action.label}
              </button>
            </form>
          )
        )}
      </div>

      {!confirmOpen && state.status !== "idle" && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={clsx(
            styles.message,
            state.status === "error" ? styles.error : styles.success
          )}
        >
          {state.message}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen && !succeeded}
        onClose={() => setConfirmOpen(false)}
        title={`Close “${title}”?`}
        description="It disappears from the careers page and stops accepting applications. Existing applications are kept, and you can reopen the job at any time."
        confirmLabel="Close job"
        tone="danger"
        action={formAction}
        pending={pending}
        error={isFresh && state.status === "error" ? state.message : null}
      >
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="status" value="CLOSED" />
      </ConfirmDialog>
    </div>
  );
}