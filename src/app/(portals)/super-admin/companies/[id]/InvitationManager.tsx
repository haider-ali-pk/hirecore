"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";
import { Check, Copy, TriangleAlert } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import GlowButton from "@/components/ui/GlowButton";
import StatusBadge from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/StatusBadge";
import TextField from "@/components/ui/TextField";
import type { InviteState } from "@/lib/invitations";
import { invitationAction } from "./invitation-actions";
import type { InvitationState } from "./invitation-actions";
import styles from "./InvitationManager.module.css";

export interface InvitationRow {
  id: string;
  email: string;
  name: string | null;
  roleLabel: string;
  state: InviteState;
  invitedBy: string | null;
  createdAt: string;
  expiresAt: string;
}

const IDLE: InvitationState = { status: "idle" };

const STATE_BADGE: Record<InviteState, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "info" },
  accepted: { label: "Accepted", tone: "success" },
  revoked: { label: "Revoked", tone: "neutral" },
  expired: { label: "Expired", tone: "warning" },
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

interface InvitationManagerProps {
  tenantId: string;
  invitations: InvitationRow[];
  inviteTtlDays: number;
}

export default function InvitationManager({
  tenantId,
  invitations,
  inviteTtlDays,
}: InvitationManagerProps) {
  const [state, formAction, pending] = useActionState(invitationAction, IDLE);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const issued = state.status === "created" ? state : null;
  const showLink = issued !== null && issued.issuedAt !== dismissed;

  const inviteError =
    state.status === "error" && state.intent === "invite" ? state : null;

  const rowMessage =
    state.status === "success"
      ? { tone: "success" as const, text: state.message }
      : state.status === "error" && state.intent !== "invite" && state.message
        ? { tone: "error" as const, text: state.message }
        : null;

  // A fresh, empty form after an invitation is created from it.
  const formKey =
    state.status === "created" && state.intent === "invite" ? state.issuedAt : "invite";

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link stays selectable in the field.
    }
  };

  const rowForm = (invitationId: string, intent: "reissue" | "revoke") => (
    <form action={formAction}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="invitationId" value={invitationId} />
      <input type="hidden" name="intent" value={intent} />
      <button
        type="submit"
        className={clsx(styles.rowButton, intent === "revoke" && styles.rowDanger)}
        disabled={pending}
      >
        {intent === "reissue" ? "New link" : "Revoke"}
      </button>
    </form>
  );

  return (
    <section className={styles.section} aria-labelledby="invitations-title">
      <div className={styles.head}>
        <h2 id="invitations-title" className={styles.title}>
          Invitations
        </h2>
        <p className={styles.text}>
          Links work once and last {inviteTtlDays} days. If one is lost or went to the
          wrong place, use New link: the old one stops working straight away.
        </p>
      </div>

      {showLink && issued && (
        <div className={styles.linkPanel} role="status">
          <p className={styles.linkTitle}>
            Invitation link for <strong>{issued.email}</strong>
          </p>

          <div className={styles.linkRow}>
            <input
              readOnly
              value={issued.inviteUrl}
              className={styles.linkInput}
              aria-label="Invitation link"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              type="button"
              className={styles.copyButton}
              onClick={() => copyLink(issued.inviteUrl)}
            >
              {copied ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Copy size={16} aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>

          <p className={styles.linkNote}>
            <TriangleAlert size={16} aria-hidden="true" />
            <span>
              Expires on {dateFormat.format(new Date(issued.expiresAt))}. It is shown only
              now, because only a hash of it is stored.
            </span>
          </p>

          <div className={styles.linkActions}>
            <button
              type="button"
              className={styles.rowButton}
              onClick={() => setDismissed(issued.issuedAt)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {rowMessage && (
        <p
          role={rowMessage.tone === "error" ? "alert" : "status"}
          className={clsx(
            styles.message,
            rowMessage.tone === "error" ? styles.messageError : styles.messageSuccess
          )}
        >
          {rowMessage.text}
        </p>
      )}

      {invitations.length === 0 ? (
        <p className={styles.empty}>No invitations have been sent for this company.</p>
      ) : (
        <DataTable label="Invitations">
          <thead>
            <tr>
              <th scope="col">Invitee</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Sent</th>
              <th scope="col">Expires</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((row) => {
              const badge = STATE_BADGE[row.state];
              return (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name ?? row.email}</strong>
                    {row.name && <small>{row.email}</small>}
                  </td>
                  <td>{row.roleLabel}</td>
                  <td>
                    <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                  </td>
                  <td>
                    <time dateTime={row.createdAt}>
                      {dateFormat.format(new Date(row.createdAt))}
                    </time>
                    {row.invitedBy && <small>by {row.invitedBy}</small>}
                  </td>
                  <td>
                    {row.state === "pending" ? (
                      <time dateTime={row.expiresAt}>
                        {dateFormat.format(new Date(row.expiresAt))}
                      </time>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {row.state !== "accepted" && (
                      <div className={styles.rowActions}>
                        {rowForm(row.id, "reissue")}
                        {row.state === "pending" && rowForm(row.id, "revoke")}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      <div className={styles.panel}>
        <div className={styles.head}>
          <h3 className={styles.title}>Invite another company admin</h3>
          <p className={styles.text}>
            Add a second admin, or replace one whose email was wrong. They set their own
            password from the link.
          </p>
        </div>

        <form key={formKey} action={formAction} className={styles.inviteForm}>
          <input type="hidden" name="intent" value="invite" />
          <input type="hidden" name="tenantId" value={tenantId} />

          <TextField
            label="Full name"
            name="name"
            autoComplete="off"
            maxLength={80}
            required
            defaultValue={inviteError?.values?.name ?? ""}
            error={inviteError?.fieldErrors?.name}
          />

          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="name@company.com"
            required
            defaultValue={inviteError?.values?.email ?? ""}
            error={inviteError?.fieldErrors?.email}
          />

          <div className={styles.inviteFooter}>
            <GlowButton type="submit" variant="ghost" loading={pending}>
              Create invitation
            </GlowButton>
            {inviteError?.message && (
              <p role="alert" className={clsx(styles.message, styles.messageError)}>
                {inviteError.message}
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}