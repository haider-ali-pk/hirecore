"use client";

import { useActionState } from "react";
import clsx from "clsx";
import GlowButton from "@/components/ui/GlowButton";
import SelectField from "@/components/ui/SelectField";
import { PLAN_LABEL, PLAN_TIERS } from "@/lib/tenants";
import type { PlanTier } from "@/lib/tenants";
import { updatePlanAction } from "./actions";
import type { ControlState } from "./actions";
import styles from "./CompanyControls.module.css";

const INITIAL_STATE: ControlState = { status: "idle" };

const PLAN_OPTIONS = PLAN_TIERS.map((tier) => ({
  value: tier,
  label: PLAN_LABEL[tier],
}));

interface PlanFormProps {
  tenantId: string;
  plan: PlanTier;
}

export default function PlanForm({ tenantId, plan }: PlanFormProps) {
  const [state, formAction, pending] = useActionState(updatePlanAction, INITIAL_STATE);

  return (
    // Re-keyed on the saved plan so the select resets to the new value.
    <form key={plan} action={formAction} className={styles.planForm}>
      <input type="hidden" name="tenantId" value={tenantId} />

      <SelectField
        label="Plan"
        name="plan"
        options={PLAN_OPTIONS}
        defaultValue={plan}
        className={styles.planField}
      />

      <GlowButton type="submit" variant="ghost" loading={pending}>
        Save plan
      </GlowButton>

      {state.status !== "idle" && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={clsx(
            styles.message,
            state.status === "error" ? styles.messageError : styles.messageSuccess
          )}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}