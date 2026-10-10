import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { SLUG_PATTERN } from "@/lib/slug";
import type { TenantStatus } from "@/lib/tenants";

/** Workspaces whose careers page is visible to the public. */
const PUBLIC_TENANT_STATUSES: TenantStatus[] = ["TRIAL", "ACTIVE"];

export const getPublicTenant = cache(async (slug: string) => {
  if (!SLUG_PATTERN.test(slug) || slug.length > 40) return null;

  return prisma.tenant.findFirst({
    where: { slug, status: { in: PUBLIC_TENANT_STATUSES } },
    select: { id: true, name: true, slug: true },
  });
});

export const getPublicJob = cache(async (slug: string, jobId: string) => {
  if (!SLUG_PATTERN.test(slug) || slug.length > 40 || jobId.length > 64) return null;

  return prisma.job.findFirst({
    where: {
      id: jobId,
      status: "OPEN",
      tenant: { slug, status: { in: PUBLIC_TENANT_STATUSES } },
    },
    select: {
      id: true,
      title: true,
      location: true,
      employmentType: true,
      workMode: true,
      description: true,
      requirements: true,
      tenant: { select: { id: true, name: true, slug: true } },
    },
  });
});