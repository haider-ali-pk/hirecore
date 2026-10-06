import { createHash, randomBytes } from "node:crypto";
import type { Role } from "@/lib/roles";

/** How long an invitation link stays valid. */
export const INVITE_TTL_DAYS = 7;

/** Roles that can be granted by invitation. Candidates sign up on their own. */
export const INVITABLE_ROLES = [
  "COMPANY_ADMIN",
  "RECRUITER",
  "HIRING_MANAGER",
  "EMPLOYEE",
] as const satisfies readonly Role[];

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export type InviteState = "pending" | "accepted" | "revoked" | "expired";

/** SHA-256 of the raw token. Only the hash is ever stored. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A fresh URL-safe token (256 bits) plus the hash to store. */
export function generateInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInviteToken(token) };
}

export function inviteExpiryFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function inviteState(
  invite: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now: Date = new Date()
): InviteState {
  if (invite.acceptedAt) return "accepted";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt <= now) return "expired";
  return "pending";
}

export function buildInviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/accept-invite?token=${encodeURIComponent(token)}`;
}