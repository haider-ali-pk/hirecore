import type { Metadata } from "next";
import type { ReactNode } from "react";
import PortalShell from "@/components/layout/PortalShell";
import { requireTenantPortal } from "@/lib/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function RecruiterLayout({ children }: { children: ReactNode }) {
  const { user } = await requireTenantPortal("RECRUITER");

  return (
    <PortalShell
      role={user.role}
      user={{ name: user.name ?? "Recruiter", email: user.email ?? "" }}
    >
      {children}
    </PortalShell>
  );
}