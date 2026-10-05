"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type {
  FocusEvent as ReactFocusEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  Menu,
  Mic,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Logo from "@/components/ui/Logo";
import GlowButton from "@/components/ui/GlowButton";
import styles from "./FloatingNav.module.css";

interface MenuItem {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

type NavEntry =
  | { kind: "menu"; key: string; label: string; items: MenuItem[] }
  | { kind: "link"; key: string; label: string; href: string };

/* Hash links point at landing page sections that are built in a later step. */
const NAV: NavEntry[] = [
  {
    kind: "menu",
    key: "platform",
    label: "Platform",
    items: [
      {
        title: "AI Screening",
        description: "Parse, score and rank every CV against the role.",
        href: "/#ai-screening",
        icon: Sparkles,
      },
      {
        title: "Pipeline",
        description: "One board for every candidate and every stage.",
        href: "/#pipeline",
        icon: Users,
      },
      {
        title: "Interviews",
        description: "Scheduling, scorecards and AI question kits.",
        href: "/#interviews",
        icon: Calendar,
      },
      {
        title: "Analytics",
        description: "Time-to-hire, drop-off and pipeline health.",
        href: "/#analytics",
        icon: TrendingUp,
      },
    ],
  },
  {
    kind: "menu",
    key: "audience",
    label: "Who it's for",
    items: [
      {
        title: "Recruiters",
        description: "Fill roles faster with an AI copilot beside you.",
        href: "/#recruiters",
        icon: Briefcase,
      },
      {
        title: "Hiring managers",
        description: "Review shortlists and give feedback in minutes.",
        href: "/#hiring-managers",
        icon: ClipboardCheck,
      },
      {
        title: "Candidates",
        description: "Apply once, track every step, practise interviews.",
        href: "/#candidates",
        icon: Mic,
      },
      {
        title: "Companies",
        description: "Multi-team control, roles and a full audit trail.",
        href: "/#companies",
        icon: Building2,
      },
    ],
  },
  { kind: "link", key: "resources", label: "Resources", href: "/#resources" },
];

interface FloatingNavProps {
  ctaLabel?: string;
  ctaHref?: string;
  signInHref?: string;
}

export default function FloatingNav({
  ctaLabel = "Book a demo",
  ctaHref = "/register",
  signInHref = "/login",
}: FloatingNavProps) {
  const baseId = useId();
  const mobileId = `${baseId}-mobile`;

  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | null>(null);
  const openedBy = useRef<"hover" | "click" | null>(null);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);

  const clearTimer = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const closeMenus = useCallback(() => {
    clearTimer();
    openedBy.current = null;
    setOpenKey(null);
  }, [clearTimer]);

  const closeAll = useCallback(() => {
    closeMenus();
    setMobileOpen(false);
    setMobileGroup(null);
  }, [closeMenus]);

  /* Scrolled state is written straight to the DOM to avoid re-rendering on scroll */
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const onScroll = () => {
      header.dataset.scrolled = window.scrollY > 8 ? "true" : "false";
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Outside click and Escape */
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const header = headerRef.current;
      if (header && e.target instanceof Node && !header.contains(e.target)) {
        closeAll();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const header = headerRef.current;
      const expanded = header?.querySelector<HTMLElement>(
        '[data-nav-trigger][aria-expanded="true"]'
      );
      if (expanded && header?.contains(document.activeElement)) {
        expanded.focus();
      }
      closeAll();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeAll]);

  /* Close the mobile menu when the viewport grows to desktop size */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 981px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setMobileOpen(false);
        setMobileGroup(null);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* Lock page scroll while the mobile menu is open */
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  useEffect(() => clearTimer, [clearTimer]);

  /* Desktop dropdown handlers */
  const handleEnter = (key: string) => (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimer();
    openedBy.current =
      openedBy.current === "click" && openKey === key ? "click" : "hover";
    setOpenKey(key);
  };

  const handleLeave = (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse" || openedBy.current === "click") return;
    clearTimer();
    closeTimer.current = window.setTimeout(() => {
      openedBy.current = null;
      setOpenKey(null);
    }, 140);
  };

  const handleTriggerClick = (key: string) => () => {
    if (openKey === key && openedBy.current === "click") {
      closeMenus();
      return;
    }
    clearTimer();
    openedBy.current = "click";
    setOpenKey(key);
  };

  const handleBlur = (key: string) => (e: ReactFocusEvent<HTMLLIElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && !e.currentTarget.contains(next) && openKey === key) {
      closeMenus();
    }
  };

  const handleToggleMobile = () => {
    closeMenus();
    if (mobileOpen) setMobileGroup(null);
    setMobileOpen((value) => !value);
  };

  return (
    <header ref={headerRef} className={styles.header} data-scrolled="false">
      <div className={styles.bar}>
        <Logo tone="dark" className={styles.logo} />

        <nav className={styles.nav} aria-label="Primary">
          <ul className={styles.links}>
            {NAV.map((entry) => {
              if (entry.kind === "link") {
                return (
                  <li key={entry.key}>
                    <Link href={entry.href} className={styles.link} onClick={closeAll}>
                      {entry.label}
                    </Link>
                  </li>
                );
              }

              const isOpen = openKey === entry.key;
              const panelId = `${baseId}-${entry.key}`;

              return (
                <li
                  key={entry.key}
                  className={styles.menuItem}
                  onPointerEnter={handleEnter(entry.key)}
                  onPointerLeave={handleLeave}
                  onBlur={handleBlur(entry.key)}
                >
                  <button
                    type="button"
                    className={clsx(styles.link, isOpen && styles.triggerOpen)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    data-nav-trigger
                    onClick={handleTriggerClick(entry.key)}
                  >
                    {entry.label}
                    <ChevronDown
                      size={14}
                      strokeWidth={2.4}
                      className={styles.caret}
                      aria-hidden="true"
                    />
                  </button>

                  <div
                    id={panelId}
                    className={clsx(styles.panel, isOpen && styles.panelOpen)}
                  >
                    <ul className={styles.panelList}>
                      {entry.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <li key={item.title}>
                            <Link href={item.href} className={styles.item} onClick={closeAll}>
                              <span className={styles.itemIcon} aria-hidden="true">
                                <Icon size={18} strokeWidth={2} />
                              </span>
                              <span className={styles.itemText}>
                                <span className={styles.itemTitle}>{item.title}</span>
                                <span className={styles.itemDesc}>{item.description}</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.actions}>
          <Link href={signInHref} className={styles.signIn} onClick={closeAll}>
            Sign in
          </Link>
          <span className={styles.divider} aria-hidden="true" />
          <GlowButton href={ctaHref}>{ctaLabel}</GlowButton>
        </div>

        <button
          type="button"
          className={styles.toggle}
          aria-expanded={mobileOpen}
          aria-controls={mobileId}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          data-nav-trigger
          onClick={handleToggleMobile}
        >
          {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      <div id={mobileId} className={clsx(styles.mobile, mobileOpen && styles.mobileOpen)}>
        <div className={styles.mobilePanel}>
          <ul>
            {NAV.map((entry) => {
              if (entry.kind === "link") {
                return (
                  <li key={entry.key}>
                    <Link href={entry.href} className={styles.mobileLink} onClick={closeAll}>
                      {entry.label}
                    </Link>
                  </li>
                );
              }

              const isOpen = mobileGroup === entry.key;
              const groupId = `${mobileId}-${entry.key}`;

              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    className={styles.mobileLink}
                    aria-expanded={isOpen}
                    aria-controls={groupId}
                    onClick={() =>
                      setMobileGroup((current) => (current === entry.key ? null : entry.key))
                    }
                  >
                    {entry.label}
                    <ChevronDown
                      size={18}
                      strokeWidth={2.2}
                      className={clsx(styles.caret, isOpen && styles.caretOpen)}
                      aria-hidden="true"
                    />
                  </button>

                  <div
                    id={groupId}
                    className={clsx(styles.mobileGroup, isOpen && styles.mobileGroupOpen)}
                  >
                    <ul className={styles.mobileGroupInner}>
                      {entry.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <li key={item.title}>
                            <Link href={item.href} className={styles.item} onClick={closeAll}>
                              <span className={styles.itemIcon} aria-hidden="true">
                                <Icon size={18} strokeWidth={2} />
                              </span>
                              <span className={styles.itemText}>
                                <span className={styles.itemTitle}>{item.title}</span>
                                <span className={styles.itemDesc}>{item.description}</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className={styles.mobileActions}>
            <GlowButton href={signInHref} variant="ghost" onClick={closeAll}>
              Sign in
            </GlowButton>
            <GlowButton href={ctaHref} onClick={closeAll}>
              {ctaLabel}
            </GlowButton>
          </div>
        </div>
      </div>
    </header>
  );
}