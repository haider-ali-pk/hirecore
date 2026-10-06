import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Search, ShieldCheck } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import GlowButton from "@/components/ui/GlowButton";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  PLAN_LABEL,
  TENANT_STATUSES,
  TENANT_STATUS_META,
  isTenantStatus,
} from "@/lib/tenants";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Companies" };

const BASE_PATH = "/super-admin/companies";
const NEW_PATH = "/super-admin/companies/new";
const PAGE_SIZE = 20;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function listHref(state: { status?: string; q?: string; page?: number }) {
  const search = new URLSearchParams();
  if (state.status) search.set("status", state.status);
  if (state.q) search.set("q", state.q);
  if (state.page && state.page > 1) search.set("page", String(state.page));
  const query = search.toString();
  return query ? `${BASE_PATH}?${query}` : BASE_PATH;
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("SUPER_ADMIN");

  const params = await searchParams;
  const statusParam = first(params.status);
  const status = isTenantStatus(statusParam) ? statusParam : undefined;
  const q = (first(params.q) ?? "").trim().slice(0, 80);
  const requestedPage = Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1);

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [grouped, total] = await Promise.all([
    prisma.tenant.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.tenant.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  const companies = await prisma.tenant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
  });

  const counts = new Map(grouped.map((row) => [row.status, row._count._all]));
  const totalAll = grouped.reduce((sum, row) => sum + row._count._all, 0);

  const chips = [
    { key: "all", label: "All", value: undefined, count: totalAll },
    ...TENANT_STATUSES.map((value) => ({
      key: value,
      label: TENANT_STATUS_META[value].label,
      value,
      count: counts.get(value) ?? 0,
    })),
  ];

  const hasFilters = Boolean(status || q);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Super admin"
        eyebrowIcon={<ShieldCheck size={16} strokeWidth={2} />}
        title="Companies"
        description="Every workspace on HireCore, with its plan, status and team size."
        actions={<GlowButton href={NEW_PATH}>New company</GlowButton>}
      />

      <div className={styles.toolbar}>
        <nav className={styles.chips} aria-label="Filter by status">
          {chips.map((chip) => {
            const active = chip.value === status;
            return (
              <Link
                key={chip.key}
                href={listHref({ status: chip.value, q })}
                className={clsx(styles.chip, active && styles.chipActive)}
                aria-current={active ? "page" : undefined}
              >
                {chip.label}
                <span className={styles.chipCount}>{chip.count}</span>
              </Link>
            );
          })}
        </nav>

        <form action={BASE_PATH} method="get" role="search" className={styles.search}>
          {status && <input type="hidden" name="status" value={status} />}
          <label className={styles.searchBox}>
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search companies</span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by name or slug"
              className={styles.searchInput}
              maxLength={80}
            />
          </label>
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
        </form>
      </div>

      {companies.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>
            {hasFilters ? "No companies match" : "No companies yet"}
          </p>
          <p className={styles.emptyText}>
            {hasFilters
              ? "Try a different search or status filter."
              : "Companies you create appear here with their plan, status and team size."}
          </p>
          {hasFilters ? (
            <Link href={BASE_PATH} className={styles.emptyLink}>
              Clear filters
            </Link>
          ) : (
            <Link href={NEW_PATH} className={styles.emptyLink}>
              Create the first company
            </Link>
          )}
        </div>
      ) : (
        <DataTable label="Companies">
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col">Plan</th>
              <th scope="col">Status</th>
              <th scope="col">Users</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const meta = TENANT_STATUS_META[company.status];
              return (
                <tr key={company.id}>
                  <td>
                    <strong>{company.name}</strong>
                    <small>{company.slug}</small>
                  </td>
                  <td>{PLAN_LABEL[company.plan]}</td>
                  <td>
                    <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                  </td>
                  <td>{company._count.users}</td>
                  <td>
                    <time dateTime={company.createdAt.toISOString()}>
                      {dateFormat.format(company.createdAt)}
                    </time>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      {pageCount > 1 && (
        <nav className={styles.pager} aria-label="Pagination">
          <Link
            href={listHref({ status, q, page: page - 1 })}
            className={clsx(styles.pagerLink, page <= 1 && styles.pagerDisabled)}
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Previous
          </Link>
          <span className="mono-label">
            Page {page} of {pageCount}
          </span>
          <Link
            href={listHref({ status, q, page: page + 1 })}
            className={clsx(styles.pagerLink, page >= pageCount && styles.pagerDisabled)}
            aria-disabled={page >= pageCount}
            tabIndex={page >= pageCount ? -1 : undefined}
          >
            Next
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      )}
    </div>
  );
}