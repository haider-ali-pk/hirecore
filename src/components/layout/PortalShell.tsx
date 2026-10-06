"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  BadgeCheck,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { signOutAction } from "@/lib/auth-actions";
import { NAV_BY_ROLE } from "@/lib/portal-nav";
import type { IconKey } from "@/lib/portal-nav";
import { PORTAL_HOME, ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/lib/roles";
import styles from "./PortalShell.module.css";

const ICONS: Record<IconKey, LucideIcon> = {
  overview: LayoutDashboard,
  tenants: Building2,
  users: Users,
  plans: BadgeCheck,
  audit: ScrollText,
  settings: Settings,
};

interface PortalShellProps {
  role: Role;
  user: { name: string; email: string };
  children: ReactNode;
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

export default function PortalShell({ role, user, children }: PortalShellProps) {
  const pathname = usePathname();
  const sidebarId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const home = PORTAL_HOME[role];
  const items = NAV_BY_ROLE[role];

  const isActive = (href: string) =>
    href === home
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  /* While the drawer is open: lock page scroll, close on Escape (returning
     focus to the menu button) and close if the viewport grows to desktop. */
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };

    const mediaQuery = window.matchMedia("(min-width: 981px)");
    const onBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    mediaQuery.addEventListener("change", onBreakpoint);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      mediaQuery.removeEventListener("change", onBreakpoint);
    };
  }, [open]);

  return (
    <div className={styles.shell}>
      <header className={styles.mobileBar}>
        <Logo href={home} size="sm" />
        <button
          ref={toggleRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls={sidebarId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </header>

      <div
        className={clsx(styles.scrim, open && styles.scrimOpen)}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside
        id={sidebarId}
        className={clsx(styles.sidebar, open && styles.sidebarOpen)}
        aria-label="Sidebar"
      >
        <div className={styles.brand}>
          <Logo href={home} size="md" />
          <span className={styles.roleBadge}>{ROLE_LABEL[role]}</span>
        </div>

        <nav className={styles.nav} aria-label="Primary">
          <ul className={styles.navList}>
            {items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={clsx(styles.navLink, active && styles.navActive)}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={18} strokeWidth={2} aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.account}>
          <div className={styles.user}>
            <span className={styles.avatar} aria-hidden="true">
              {initialsOf(user.name)}
            </span>
            <span className={styles.userText}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </span>
          </div>

          <form action={signOutAction}>
            <button type="submit" className={styles.signOut}>
              <LogOut size={18} strokeWidth={2} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main id="main" className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </main>
    </div>
  );
}