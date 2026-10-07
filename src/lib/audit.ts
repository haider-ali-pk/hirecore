import { ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/lib/roles";
import { PLAN_LABEL, TENANT_STATUS_META } from "@/lib/tenants";
import type { PlanTier, TenantStatus } from "@/lib/tenants";

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "user.created": "Account created",
  "tenant.created": "Company created",
  "tenant.plan_changed": "Plan changed",
  "tenant.status_changed": "Status changed",
  "invitation.created": "Invitation sent",
  "invitation.revoked": "Invitation revoked",
  "invitation.accepted": "Invitation accepted",
};

/** A readable title for an audit action. Unknown actions are tidied, not hidden. */
export function auditActionLabel(action: string): string {
  const known = ACTION_LABELS[action];
  if (known) return known;

  const words = action.replace(/[._]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Activity";
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

const statusLabel = (value: unknown): string => {
  const raw = text(value);
  return raw && raw in TENANT_STATUS_META
    ? TENANT_STATUS_META[raw as TenantStatus].label
    : (raw ?? "Unknown");
};

const planLabel = (value: unknown): string => {
  const raw = text(value);
  return raw && raw in PLAN_LABEL ? PLAN_LABEL[raw as PlanTier] : (raw ?? "Unknown");
};

const roleLabel = (value: unknown): string => {
  const raw = text(value);
  return raw && raw in ROLE_LABEL ? ROLE_LABEL[raw as Role] : (raw ?? "Unknown");
};

/** A short second line for an audit entry, or null when there is nothing to add. */
export function auditDetail(action: string, metadata: unknown): string | null {
  if (!isRecord(metadata)) return null;

  switch (action) {
    case "tenant.status_changed": {
      const change = `${statusLabel(metadata.from)} → ${statusLabel(metadata.to)}`;
      const reason = text(metadata.reason);
      return reason ? `${change} · ${reason}` : change;
    }

    case "tenant.plan_changed":
      return `${planLabel(metadata.from)} → ${planLabel(metadata.to)}`;

    case "tenant.created":
      return `${planLabel(metadata.plan)} plan · ${statusLabel(metadata.status)}`;

    case "invitation.created": {
      const parts = [text(metadata.email), roleLabel(metadata.role)].filter(Boolean);
      if (metadata.reissued === true) parts.push("new link");
      return parts.join(" · ");
    }

    case "invitation.revoked": {
      const email = text(metadata.email);
      return metadata.reason === "replaced"
        ? [email, "replaced by a new link"].filter(Boolean).join(" · ")
        : (email ?? null);
    }

    case "invitation.accepted":
    case "user.created":
      return metadata.role ? roleLabel(metadata.role) : null;

    default:
      return null;
  }
}