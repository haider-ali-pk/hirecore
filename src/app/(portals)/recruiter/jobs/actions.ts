"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
  JOB_STATUS_META,
  JOB_TRANSITIONS,
  WORK_MODES,
} from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { requireTenantPortal } from "@/lib/session";

const JOB_FIELDS = [
  "title",
  "location",
  "employmentType",
  "workMode",
  "description",
  "requirements",
] as const;

export type JobField = (typeof JOB_FIELDS)[number];

export type JobFormState =
  | { status: "idle" }
  | { status: "saved"; message: string }
  | {
      status: "error";
      message?: string;
      fieldErrors?: Partial<Record<JobField, string>>;
      /** Echoed back so the form keeps what was typed. */
      values?: Partial<Record<JobField, string>>;
    };

export type JobStatusState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const idSchema = z.string().min(1).max(64);

const jobFields = {
  title: z.string().trim().min(3, "Enter the job title.").max(120, "Keep the title under 120 characters."),
  location: z.string().trim().min(2, "Enter the location.").max(120, "Keep the location under 120 characters."),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  workMode: z.enum(WORK_MODES),
  description: z
    .string()
    .trim()
    .min(30, "Describe the role in at least 30 characters.")
    .max(10000, "Keep the description under 10,000 characters."),
  requirements: z.string().trim().max(6000, "Keep the requirements under 6,000 characters.").optional(),
};

const createSchema = z.object({ ...jobFields, intent: z.enum(["draft", "publish"]) });
const updateSchema = z.object({ ...jobFields, jobId: idSchema });
const statusSchema = z.object({ jobId: idSchema, status: z.enum(JOB_STATUSES) });

const isField = (value: string): value is JobField =>
  (JOB_FIELDS as readonly string[]).includes(value);

function collectErrors(error: z.ZodError): Partial<Record<JobField, string>> {
  const out: Partial<Record<JobField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && isField(key) && !out[key]) out[key] = issue.message;
  }
  return out;
}

function echoValues(formData: FormData): Partial<Record<JobField, string>> {
  const out: Partial<Record<JobField, string>> = {};
  for (const field of JOB_FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string") out[field] = value;
  }
  return out;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

export async function createJobAction(
  _previous: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const { user, tenantId } = await requireTenantPortal("RECRUITER");

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: collectErrors(parsed.error),
      values: echoValues(formData),
    };
  }

  const { intent, requirements, ...fields } = parsed.data;
  const publish = intent === "publish";

  let jobId: string;

  try {
    const now = new Date();

    jobId = await prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          ...fields,
          requirements: requirements || null,
          tenantId,
          createdById: user.id,
          status: publish ? "OPEN" : "DRAFT",
          publishedAt: publish ? now : null,
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: user.id,
          action: "job.created",
          entityType: "Job",
          entityId: job.id,
          metadata: { title: fields.title, status: publish ? "OPEN" : "DRAFT" },
        },
      });

      return job.id;
    });
  } catch (error) {
    console.error("Failed to create job:", error);
    return { status: "error", message: GENERIC_ERROR, values: echoValues(formData) };
  }

  revalidatePath("/recruiter");
  revalidatePath("/recruiter/jobs");
  redirect(`/recruiter/jobs/${jobId}`);
}

export async function updateJobAction(
  _previous: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const { user, tenantId } = await requireTenantPortal("RECRUITER");

  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: collectErrors(parsed.error),
      values: echoValues(formData),
    };
  }

  const { jobId, requirements, ...fields } = parsed.data;

  try {
    const found = await prisma.$transaction(async (tx) => {
      const result = await tx.job.updateMany({
        where: { id: jobId, tenantId },
        data: { ...fields, requirements: requirements || null },
      });

      if (result.count !== 1) return false;

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: user.id,
          action: "job.updated",
          entityType: "Job",
          entityId: jobId,
          metadata: { title: fields.title },
        },
      });

      return true;
    });

    if (!found) {
      return { status: "error", message: "That job no longer exists." };
    }
  } catch (error) {
    console.error("Failed to update job:", error);
    return { status: "error", message: GENERIC_ERROR, values: echoValues(formData) };
  }

  revalidatePath("/recruiter/jobs");
  revalidatePath(`/recruiter/jobs/${jobId}`);
  return { status: "saved", message: "Changes saved." };
}

export async function setJobStatusAction(
  _previous: JobStatusState,
  formData: FormData
): Promise<JobStatusState> {
  const { user, tenantId } = await requireTenantPortal("RECRUITER");

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "That request wasn't valid." };

  const { jobId, status } = parsed.data;

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const job = await tx.job.findFirst({
        where: { id: jobId, tenantId },
        select: { status: true, publishedAt: true },
      });

      if (!job) return "missing" as const;
      if (job.status === status) return "unchanged" as const;
      if (!JOB_TRANSITIONS[job.status].includes(status)) return "invalid" as const;

      const now = new Date();

      await tx.job.update({
        where: { id: jobId },
        data: {
          status,
          ...(status === "OPEN" && !job.publishedAt ? { publishedAt: now } : {}),
          closedAt: status === "CLOSED" ? now : null,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: user.id,
          action: "job.status_changed",
          entityType: "Job",
          entityId: jobId,
          metadata: { from: job.status, to: status },
        },
      });

      return "changed" as const;
    });

    if (outcome === "missing") return { status: "error", message: "That job no longer exists." };
    if (outcome === "invalid") {
      return { status: "error", message: "That change isn't available for this job." };
    }

    revalidatePath("/recruiter");
    revalidatePath("/recruiter/jobs");
    revalidatePath(`/recruiter/jobs/${jobId}`);

    return {
      status: "success",
      message:
        outcome === "unchanged"
          ? `Already ${JOB_STATUS_META[status].label.toLowerCase()}.`
          : `Job is now ${JOB_STATUS_META[status].label.toLowerCase()}.`,
    };
  } catch (error) {
    console.error("Failed to change job status:", error);
    return { status: "error", message: GENERIC_ERROR };
  }
}