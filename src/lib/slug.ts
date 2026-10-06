/* Pure helpers shared by the client form (live preview) and the server action
   (validation). Nothing here touches the server or the database. */

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Names that would collide with routes or look official. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "billing",
  "candidate",
  "careers",
  "company-admin",
  "dashboard",
  "docs",
  "employee",
  "help",
  "hirecore",
  "hiring-manager",
  "jobs",
  "login",
  "mail",
  "recruiter",
  "register",
  "settings",
  "static",
  "status",
  "super-admin",
  "support",
  "www",
]);

/** "Acme Ltd. (Pakistan)" -> "acme-ltd-pakistan". Returns "" if nothing usable remains. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}