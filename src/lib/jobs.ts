import type { Job } from "@/generated/prisma/client";
import type { BadgeTone } from "@/components/ui/StatusBadge";

export type JobStatus = Job["status"];
export type EmploymentType = Job["employmentType"];
export type WorkMode = Job["workMode"];

export const JOB_STATUSES = [
  "DRAFT",
  "OPEN",
  "PAUSED",
  "CLOSED",
] as const satisfies readonly JobStatus[];

export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
] as const satisfies readonly EmploymentType[];

export const WORK_MODES = ["ONSITE", "HYBRID", "REMOTE"] as const satisfies readonly WorkMode[];

export const JOB_STATUS_META: Record<JobStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "info" },
  OPEN: { label: "Open", tone: "success" },
  PAUSED: { label: "Paused", tone: "warning" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  ONSITE: "On-site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

/** Which status changes are allowed from each status. */
export const JOB_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  DRAFT: ["OPEN", "CLOSED"],
  OPEN: ["PAUSED", "CLOSED"],
  PAUSED: ["OPEN", "CLOSED"],
  CLOSED: ["OPEN"],
};

export function isJobStatus(value: unknown): value is JobStatus {
  return typeof value === "string" && (JOB_STATUSES as readonly string[]).includes(value);
}