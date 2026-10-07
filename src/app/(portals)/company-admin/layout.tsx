import type { Metadata } from "next";
import type { ReactNode } from "react";
import PortalShell from "@/components/layout/PortalShell";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CompanyAdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("COMPANY_ADMIN");

  return (
    <PortalShell
      role="COMPANY_ADMIN"
      user={{ name: user.name ?? "Company admin", email: user.email ?? "" }}
    >
      {children}
    </PortalShell>
  );
}