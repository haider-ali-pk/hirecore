"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import {
  buildInviteUrl,
  generateInviteToken,
  inviteExpiryFrom,
} from "@/lib/invitations";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  RESERVED_SLUGS,
  SLUG_MAX,
  SLUG_MIN,
  SLUG_PATTERN,
} from "@/lib/slug";
import { PLAN_TIERS, trialEndFrom } from "@/lib/tenants";

type FieldName =
  | "companyName"
  | "slug"
  | "plan"
  | "status"
  | "adminName"
  | "adminEmail";

type FieldErrors = Partial<Record<FieldName, string>>;

export type CreateCompanyState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors?: FieldErrors }
  | {
      status: "created";
      companyId: string;
      companyName: string;
      adminEmail: string;
      inviteUrl: string;
      expiresAt: string;
    };

const FIELD_NAMES: readonly string[] = [
  "companyName",
  "slug",
  "plan",
  "status",
  "adminName",
  "adminEmail",
];

const isFieldName = (value: string): value is FieldName =>
  FIELD_NAMES.includes(value);

const schema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Enter the company name.")
    .max(80, "Keep the name under 80 characters."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(SLUG_MIN, `Use at least ${SLUG_MIN} characters.`)
    .max(SLUG_MAX, `Use at most ${SLUG_MAX} characters.`)
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens only.")
    .refine((value) => !RESERVED_SLUGS.has(value), "That URL name is reserved."),
  plan: z.enum(PLAN_TIERS),
  status: z.enum(["TRIAL", "ACTIVE"]),
  adminName: z
    .string()
    .trim()
    .min(2, "Enter the admin's full name.")
    .max(80, "Keep the name under 80 characters."),
  adminEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),
});

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

/** The public origin used to build the invitation link. */
async function appOrigin(): Promise<string> {
  const configured = process.env.AUTH_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the request headers.
    }
  }

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

export async function createCompanyAction(
  _previous: CreateCompanyState,
  formData: FormData
): Promise<CreateCompanyState> {
  const actor = await requireRole("SUPER_ADMIN");

  const parsed = schema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && isFieldName(key) && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { status: "error", fieldErrors };
  }

  const { companyName, slug, plan, status, adminName, adminEmail } = parsed.data;

  const [slugTaken, emailTaken] = await Promise.all([
    prisma.tenant.findUnique({ where: { slug }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } }),
  ]);

  if (slugTaken || emailTaken) {
    return {
      status: "error",
      fieldErrors: {
        ...(slugTaken ? { slug: "That URL name is already taken." } : {}),
        ...(emailTaken
          ? { adminEmail: "An account with this email already exists." }
          : {}),
      },
    };
  }

  try {
    const now = new Date();
    const expiresAt = inviteExpiryFrom(now);
    const { token, tokenHash } = generateInviteToken();

    const tenantId = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug,
          plan,
          status,
          trialEndsAt: status === "TRIAL" ? trialEndFrom(now) : null,
        },
        select: { id: true },
      });

      const invitation = await tx.invitation.create({
        data: {
          tenantId: tenant.id,
          invitedById: actor.id,
          email: adminEmail,
          name: adminName,
          role: "COMPANY_ADMIN",
          tokenHash,
          expiresAt,
        },
        select: { id: true },
      });

      await tx.auditLog.createMany({
        data: [
          {
            tenantId: tenant.id,
            actorId: actor.id,
            action: "tenant.created",
            entityType: "Tenant",
            entityId: tenant.id,
            metadata: { name: companyName, slug, plan, status },
          },
          {
            tenantId: tenant.id,
            actorId: actor.id,
            action: "invitation.created",
            entityType: "Invitation",
            entityId: invitation.id,
            metadata: { email: adminEmail, role: "COMPANY_ADMIN" },
          },
        ],
      });

      return tenant.id;
    });

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/companies");

    return {
      status: "created",
      companyId: tenantId,
      companyName,
      adminEmail,
      inviteUrl: buildInviteUrl(await appOrigin(), token),
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: "error",
        fieldErrors: { slug: "That URL name was just taken. Choose another." },
      };
    }

    console.error("Failed to create company:", error);
    return {
      status: "error",
      message: "Something went wrong while creating the company. Please try again.",
    };
  }
}