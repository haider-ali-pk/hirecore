import type { Metadata } from "next";
import GlowButton from "@/components/ui/GlowButton";
import PageHeader from "@/components/ui/PageHeader";
import PageStack from "@/components/ui/PageStack";
import { Panel } from "@/components/ui/Panel";
import { requireTenantPortal } from "@/lib/session";
import { createJobAction } from "../actions";
import JobForm from "../JobForm";

export const metadata: Metadata = { title: "New job" };

export default async function NewJobPage() {
  await requireTenantPortal("RECRUITER");

  return (
    <PageStack>
      <PageHeader
        eyebrow="Recruiting"
        title="New job"
        description="Publish it now, or save a draft and finish later."
        actions={
          <GlowButton href="/recruiter/jobs" variant="ghost">
            Back to jobs
          </GlowButton>
        }
      />

      <Panel title="Job details">
        <JobForm mode="create" action={createJobAction} />
      </Panel>
    </PageStack>
  );
}