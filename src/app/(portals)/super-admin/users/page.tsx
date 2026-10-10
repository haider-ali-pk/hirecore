import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import {
  EmptyState,
  FilterChips,
  Pager,
  SearchForm,
  SelectFilter,
  Toolbar,
} from "@/components/ui/ListControls";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { ALL_ROLES, USER_STATUS_META, isRole, isUserStatus } from "@/lib/users";
import styles from "./page.module.css";
import UserRowActions from "./UserRowActions";

export const metadata: Metadata = { title: "Users" };

const BASE_PATH = "/super-admin/users";
const PAGE_SIZE = 20;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  ...ALL_ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] })),
];

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function listHref(state: { status?: string; role?: string; q?: string; page?: number }) {
  const search = new URLSearchParams();
  if (state.status) search.set("status", state.status);
  if (state.role) search.set("role", state.role);
  if (state.q) search.set("q", state.q);
  if (state.page && state.page > 1) search.set("page", String(state.page));
  const query = search.toString();
  return query ? `${BASE_PATH}?${query}` : BASE_PATH;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const me = await requireRole("SUPER_ADMIN");

  const params = await searchParams;
  const statusParam = first(params.status);
  const roleParam = first(params.role);
  const status = isUserStatus(statusParam) ? statusParam : undefined;
  const role = isRole(roleParam) ? roleParam : undefined;
  const q = (first(params.q) ?? "").trim().slice(0, 80);
  const requestedPage = Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1);

  const where = {
    ...(status ? { status } : {}),
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [grouped, total] = await Promise.all([
    prisma.user.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      tenant: { select: { id: true, name: true } },
    },
  });

  const counts = new Map(grouped.map((row) => [row.status, row._count._all]));
  const totalAll = grouped.reduce((sum, row) => sum + row._count._all, 0);

  const chips = [
    {
      key: "all",
      label: "All",
      href: listHref({ role, q }),
      count: totalAll,
      active: status === undefined,
    },
    ...(["ACTIVE", "SUSPENDED"] as const).map((value) => ({
      key: value,
      label: USER_STATUS_META[value].label,
      href: listHref({ status: value, role, q }),
      count: counts.get(value) ?? 0,
      active: status === value,
    })),
  ];

  const hasFilters = Boolean(status || role || q);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Super admin"
        eyebrowIcon={<ShieldCheck size={16} strokeWidth={2} />}
        title="Users"
        description="Everyone on HireCore across every company, with their role and sign-in activity."
      />

      <Toolbar>
        <FilterChips label="Filter by status" items={chips} />

        <SearchForm
          action={BASE_PATH}
          query={q}
          placeholder="Search by name or email"
          label="Search users"
          hidden={status ? { status } : undefined}
        >
          <SelectFilter
            name="role"
            label="Filter by role"
            value={role ?? ""}
            options={ROLE_OPTIONS}
          />
        </SearchForm>
      </Toolbar>

      {users.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No users match" : "No users yet"}
          text={
            hasFilters
              ? "Try a different search, role or status filter."
              : "Accounts appear here as people join."
          }
          action={hasFilters ? { href: BASE_PATH, label: "Clear filters" } : undefined}
        />
      ) : (
        <DataTable label="Users">
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Role</th>
              <th scope="col">Company</th>
              <th scope="col">Status</th>
              <th scope="col">Last sign-in</th>
              <th scope="col">Joined</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const statusMeta = USER_STATUS_META[user.status];
              return (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </td>
                  <td>{ROLE_LABEL[user.role]}</td>
                  <td>
                    {user.tenant ? (
                      <Link
                        href={`/super-admin/companies/${user.tenant.id}`}
                        className={styles.companyLink}
                      >
                        {user.tenant.name}
                      </Link>
                    ) : user.role === "SUPER_ADMIN" ? (
                      "Platform"
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge tone={statusMeta.tone}>{statusMeta.label}</StatusBadge>
                  </td>
                  <td>
                    {user.lastLoginAt ? (
                      <time dateTime={user.lastLoginAt.toISOString()}>
                        {dateTimeFormat.format(user.lastLoginAt)}
                      </time>
                    ) : (
                      <span className={styles.muted}>Never</span>
                    )}
                  </td>
                  <td>
                    <time dateTime={user.createdAt.toISOString()}>
                      {dateFormat.format(user.createdAt)}
                    </time>
                  </td>
                  <td>
                    <UserRowActions
                      userId={user.id}
                      name={user.name}
                      status={user.status}
                      isSelf={user.id === me.id}
                    />
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
        prevHref={page > 1 ? listHref({ status, role, q, page: page - 1 }) : null}
        nextHref={page < pageCount ? listHref({ status, role, q, page: page + 1 }) : null}
      />
    </div>
  );
}