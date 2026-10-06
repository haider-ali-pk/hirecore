import type { Metadata } from "next";
import type { ReactNode } from "react";
import PortalShell from "@/components/layout/PortalShell";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("SUPER_ADMIN");

  return (
    <PortalShell
      role="SUPER_ADMIN"
      user={{ name: user.name ?? "Super admin", email: user.email ?? "" }}
    >
      {children}
    </PortalShell>
  );
}