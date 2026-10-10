"use client";

import { useActionState } from "react";
import clsx from "clsx";
import SelectField from "@/components/ui/SelectField";
import TextAreaField from "@/components/ui/TextAreaField";
import TextField from "@/components/ui/TextField";
import {
  EMPLOYMENT_LABEL,
  EMPLOYMENT_TYPES,
  WORK_MODES,
  WORK_MODE_LABEL,
} from "@/lib/jobs";
import type { EmploymentType, WorkMode } from "@/lib/jobs";
import type { JobField, JobFormState } from "./actions";
import styles from "./JobForm.module.css";

const IDLE: JobFormState = { status: "idle" };

const TYPE_OPTIONS = EMPLOYMENT_TYPES.map((value) => ({
  value,
  label: EMPLOYMENT_LABEL[value],
}));

const MODE_OPTIONS = WORK_MODES.map((value) => ({
  value,
  label: WORK_MODE_LABEL[value],
}));

export interface JobFormJob {
  id: string;
  title: string;
  location: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  description: string;
  requirements: string | null;
}

interface JobFormProps {
  mode: "create" | "edit";
  action: (previous: JobFormState, formData: FormData) => Promise<JobFormState>;
  job?: JobFormJob;
}

export default function JobForm({ mode, action, job }: JobFormProps) {
  const [state, formAction, pending] = useActionState(action, IDLE);

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const echoed = state.status === "error" ? state.values : undefined;

  const value = (field: JobField, fallback: string) =>
    echoed?.[field] ?? (job ? String(job[field] ?? "") : fallback);

  return (
    <form action={formAction} className={styles.form}>
      {job && <input type="hidden" name="jobId" value={job.id} />}

      {state.status === "error" && state.message && (
        <div className={styles.alert} role="alert">
          {state.message}
        </div>
      )}

      <div className={styles.grid}>
        <TextField
          label="Job title"
          name="title"
          placeholder="Senior Frontend Engineer"
          maxLength={120}
          required
          defaultValue={value("title", "")}
          error={errors.title}
        />
        <TextField
          label="Location"
          name="location"
          placeholder="Lahore, Pakistan"
          maxLength={120}
          required
          defaultValue={value("location", "")}
          error={errors.location}
        />
        <SelectField
          label="Employment type"
          name="employmentType"
          options={TYPE_OPTIONS}
          defaultValue={value("employmentType", "FULL_TIME")}
          error={errors.employmentType}
        />
        <SelectField
          label="Work mode"
          name="workMode"
          options={MODE_OPTIONS}
          defaultValue={value("workMode", "ONSITE")}
          error={errors.workMode}
        />
      </div>

      <TextAreaField
        label="Description"
        name="description"
        placeholder="What the role is, what the team does and what success looks like."
        rows={8}
        maxLength={10000}
        required
        defaultValue={value("description", "")}
        error={errors.description}
      />

      <TextAreaField
        label="Requirements"
        name="requirements"
        placeholder="Skills, experience and qualifications. The AI screening uses this to score candidates."
        rows={6}
        maxLength={6000}
        defaultValue={value("requirements", "")}
        error={errors.requirements}
        hint="Optional, but the more specific it is, the better the AI ranking."
      />

      <div className={styles.actions}>
        {mode === "create" ? (
          <>
            <button
              type="submit"
              name="intent"
              value="publish"
              className={clsx(styles.button, styles.primary)}
              disabled={pending}
            >
              Publish job
            </button>
            <button
              type="submit"
              name="intent"
              value="draft"
              className={styles.button}
              disabled={pending}
            >
              Save as draft
            </button>
          </>
        ) : (
          <>
            <button
              type="submit"
              className={clsx(styles.button, styles.primary)}
              disabled={pending}
            >
              Save changes
            </button>
            {state.status === "saved" && (
              <span role="status" className={styles.saved}>
                {state.message}
              </span>
            )}
          </>
        )}
      </div>
    </form>
  );
}