import type { Metadata } from "next";
import { TriangleAlert } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import GlowButton from "@/components/ui/GlowButton";
import { hashInviteToken, inviteState } from "@/lib/invitations";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/roles";
import AcceptInviteForm from "./AcceptInviteForm";
import styles from "./AcceptInvite.module.css";

export const metadata: Metadata = {
  title: "Accept invitation",
  robots: { index: false, follow: false },
  // The URL carries a secret token, so never leak it through the Referer header.
  referrer: "no-referrer",
};

const ACTIVE_TENANT_STATUSES: readonly string[] = ["TRIAL", "ACTIVE"];

function Problem({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: { label: string; href: string };
}) {
  return (
    <section className={styles.card} aria-labelledby="invite-problem-title">
      <header className={styles.header}>
        <Eyebrow icon={<TriangleAlert size={16} strokeWidth={2} />}>Invitation</Eyebrow>
        <h1 id="invite-problem-title" className={`${styles.title} text-fade`}>
          {title}
        </h1>
        <p className={styles.subtitle}>{text}</p>
      </header>
      {action && (
        <GlowButton href={action.href} variant="ghost">
          {action.label}
        </GlowButton>
      )}
    </section>
  );
}

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const raw = typeof token === "string" ? token : "";

  const invite =
    raw.length >= 20 && raw.length <= 200
      ? await prisma.invitation.findUnique({
          where: { tokenHash: hashInviteToken(raw) },
          select: {
            email: true,
            name: true,
            role: true,
            expiresAt: true,
            acceptedAt: true,
            revokedAt: true,
            tenant: { select: { name: true, status: true } },
          },
        })
      : null;

  if (!invite) {
    return (
      <Problem
        title="This link isn't valid."
        text="Check that you copied the whole link, or ask your administrator for a new invitation."
      />
    );
  }

  const state = inviteState(invite);

  if (state === "accepted") {
    return (
      <Problem
        title="This invitation was already used."
        text="Sign in with the account you created."
        action={{ label: "Go to sign in", href: "/login" }}
      />
    );
  }

  if (state === "revoked") {
    return (
      <Problem
        title="This invitation was cancelled."
        text="Ask your administrator to send you a new one."
      />
    );
  }

  if (state === "expired") {
    return (
      <Problem
        title="This invitation has expired."
        text="Ask your administrator to send you a new one."
      />
    );
  }

  if (!ACTIVE_TENANT_STATUSES.includes(invite.tenant.status)) {
    return (
      <Problem
        title="This workspace isn't active."
        text="Contact your administrator to find out when it will be available."
      />
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true },
  });

  if (existingUser) {
    return (
      <Problem
        title="You already have an account."
        text="An account with this email already exists. Sign in to continue."
        action={{ label: "Go to sign in", href: "/login" }}
      />
    );
  }

  return (
    <AcceptInviteForm
      token={raw}
      companyName={invite.tenant.name}
      roleLabel={ROLE_LABEL[invite.role]}
      email={invite.email}
      defaultName={invite.name ?? ""}
    />
  );
}