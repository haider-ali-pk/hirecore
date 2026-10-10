import type { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import styles from "./ListControls.module.css";

/* Server-safe pieces: no hooks, no client state. */

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className={styles.toolbar}>{children}</div>;
}

/* ---- Filter chips ---- */

export interface FilterChip {
  key: string;
  label: string;
  href: string;
  count?: number;
  active: boolean;
}

export function FilterChips({ label, items }: { label: string; items: FilterChip[] }) {
  return (
    <nav className={styles.chips} aria-label={label}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={clsx(styles.chip, item.active && styles.chipActive)}
          aria-current={item.active ? "page" : undefined}
        >
          {item.label}
          {item.count !== undefined && (
            <span className={styles.chipCount}>{item.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

/* ---- Search form ---- */

interface SearchFormProps {
  /** Path the form submits to (GET). */
  action: string;
  query: string;
  placeholder: string;
  /** Accessible name, e.g. "Search companies". */
  label: string;
  /** Filters to keep when searching, sent as hidden inputs. */
  hidden?: Record<string, string>;
  /** Extra controls rendered before the search box, e.g. a SelectFilter. */
  children?: ReactNode;
}

export function SearchForm({
  action,
  query,
  placeholder,
  label,
  hidden,
  children,
}: SearchFormProps) {
  return (
    <form action={action} method="get" role="search" className={styles.search}>
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {children}

      <label className={styles.searchBox}>
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">{label}</span>
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={placeholder}
          className={styles.searchInput}
          maxLength={80}
        />
      </label>

      <button type="submit" className={styles.searchButton}>
        Search
      </button>
    </form>
  );
}

/* ---- Select filter ---- */

interface SelectFilterProps {
  name: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
}

export function SelectFilter({ name, label, value, options }: SelectFilterProps) {
  return (
    <label className={styles.selectBox}>
      <span className="sr-only">{label}</span>
      <select name={name} defaultValue={value} className={styles.selectInput}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className={styles.selectCaret} aria-hidden="true" />
    </label>
  );
}

/* ---- Pager ---- */

interface PagerProps {
  page: number;
  pageCount: number;
  /** Null when there is no previous or next page. */
  prevHref: string | null;
  nextHref: string | null;
}

export function Pager({ page, pageCount, prevHref, nextHref }: PagerProps) {
  if (pageCount <= 1) return null;

  return (
    <nav className={styles.pager} aria-label="Pagination">
      <Link
        href={prevHref ?? "#"}
        className={clsx(styles.pagerLink, !prevHref && styles.pagerDisabled)}
        aria-disabled={!prevHref}
        tabIndex={prevHref ? undefined : -1}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Previous
      </Link>

      <span className="mono-label">
        Page {page} of {pageCount}
      </span>

      <Link
        href={nextHref ?? "#"}
        className={clsx(styles.pagerLink, !nextHref && styles.pagerDisabled)}
        aria-disabled={!nextHref}
        tabIndex={nextHref ? undefined : -1}
      >
        Next
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </nav>
  );
}

/* ---- Empty state ---- */

interface EmptyStateProps {
  title: string;
  text: string;
  action?: { href: string; label: string };
}

export function EmptyState({ title, text, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyText}>{text}</p>
      {action && (
        <Link href={action.href} className={styles.emptyLink}>
          {action.label}
        </Link>
      )}
    </div>
  );
}