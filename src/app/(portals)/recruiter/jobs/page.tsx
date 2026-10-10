import type { Metadata } from "next";
import Link from "next/link";
import DataTable from "@/components/ui/DataTable";
import GlowButton from "@/components/ui/GlowButton";
import {
  EmptyState,
  FilterChips,
  Pager,
  SearchForm,
  Toolbar,
} from "@/components/ui/ListControls";
import PageHeader from "@/components/ui/PageHeader";
import PageStack from "@/components/ui/PageStack";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  EMPLOYMENT_LABEL,
  JOB_STATUSES,
  JOB_STATUS_META,
  WORK_MODE_LABEL,
  isJobStatus,
} from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { requireTenantPortal } from "@/lib/session";

export const metadata: Metadata = { title: "Jobs" };

const BASE_PATH = "/recruiter/jobs";
const NEW_PATH = "/recruiter/jobs/new";
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

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { tenantId } = await requireTenantPortal("RECRUITER");

  const params = await searchParams;
  const statusParam = first(params.status);
  const status = isJobStatus(statusParam) ? statusParam : undefined;
  const q = (first(params.q) ?? "").trim().slice(0, 80);
  const requestedPage = Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1);

  const where = {
    tenantId,
    ...(status ? { status } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [grouped, total] = await Promise.all([
    prisma.job.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
    prisma.job.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      title: true,
      location: true,
      employmentType: true,
      workMode: true,
      status: true,
      createdAt: true,
      _count: { select: { applications: true } },
    },
  });

  const counts = new Map(grouped.map((row) => [row.status, row._count._all]));
  const totalAll = grouped.reduce((sum, row) => sum + row._count._all, 0);

  const chips = [
    {
      key: "all",
      label: "All",
      href: listHref({ q }),
      count: totalAll,
      active: status === undefined,
    },
    ...JOB_STATUSES.map((value) => ({
      key: value,
      label: JOB_STATUS_META[value].label,
      href: listHref({ status: value, q }),
      count: counts.get(value) ?? 0,
      active: status === value,
    })),
  ];

  const hasFilters = Boolean(status || q);

  return (
    <PageStack>
      <PageHeader
        eyebrow="Recruiting"
        title="Jobs"
        description="Create roles, publish them to your careers page and track applications."
        actions={<GlowButton href={NEW_PATH}>New job</GlowButton>}
      />

      <Toolbar>
        <FilterChips label="Filter by status" items={chips} />
        <SearchForm
          action={BASE_PATH}
          query={q}
          placeholder="Search by job title"
          label="Search jobs"
          hidden={status ? { status } : undefined}
        />
      </Toolbar>

      {jobs.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No jobs match" : "No jobs yet"}
          text={
            hasFilters
              ? "Try a different search or status filter."
              : "Create your first job and publish it to your careers page."
          }
          action={
            hasFilters
              ? { href: BASE_PATH, label: "Clear filters" }
              : { href: NEW_PATH, label: "Create the first job" }
          }
        />
      ) : (
        <DataTable label="Jobs">
          <thead>
            <tr>
              <th scope="col">Job</th>
              <th scope="col">Type</th>
              <th scope="col">Mode</th>
              <th scope="col">Status</th>
              <th scope="col">Applications</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const meta = JOB_STATUS_META[job.status];
              return (
                <tr key={job.id}>
                  <td>
                    <strong>
                      <Link href={`${BASE_PATH}/${job.id}`}>{job.title}</Link>
                    </strong>
                    <small>{job.location}</small>
                  </td>
                  <td>{EMPLOYMENT_LABEL[job.employmentType]}</td>
                  <td>{WORK_MODE_LABEL[job.workMode]}</td>
                  <td>
                    <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                  </td>
                  <td>{job._count.applications}</td>
                  <td>
                    <time dateTime={job.createdAt.toISOString()}>
                      {dateFormat.format(job.createdAt)}
                    </time>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      <Pager
        page={page}
        pageCount={pageCount}
        prevHref={page > 1 ? listHref({ status, q, page: page - 1 }) : null}
        nextHref={page < pageCount ? listHref({ status, q, page: page + 1 }) : null}
      />
    </PageStack>
  );
}