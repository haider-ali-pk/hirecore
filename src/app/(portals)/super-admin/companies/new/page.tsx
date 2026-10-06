import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import GlowButton from "@/components/ui/GlowButton";
import PageHeader from "@/components/ui/PageHeader";
import { INVITE_TTL_DAYS } from "@/lib/invitations";
import { requireRole } from "@/lib/session";
import styles from "../page.module.css";
import NewCompanyForm from "./NewCompanyForm";

export const metadata: Metadata = { title: "New company" };

export default async function NewCompanyPage() {
  await requireRole("SUPER_ADMIN");

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Super admin"
        eyebrowIcon={<ShieldCheck size={16} strokeWidth={2} />}
        title="New company"
        description="Create a workspace and invite its first company admin."
        actions={
          <GlowButton href="/super-admin/companies" variant="ghost">
            Back to companies
          </GlowButton>
        }
      />

      <NewCompanyForm inviteTtlDays={INVITE_TTL_DAYS} />
    </div>
  );
}