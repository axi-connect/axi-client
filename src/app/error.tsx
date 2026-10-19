"use client";

import { ErrorRecovery } from "@/shared/components/features/error-recovery/ErrorRecovery";

/**
 * Frontera de error de la raíz: atrapa lo que lanza cualquier página (pública,
 * onboarding, /platform…) dentro del layout raíz, con los providers vivos. No
 * existía y Next pintaba su «Application error» (hotfix 2026-10-19,
 * docs/plans/hotfix_application_error_plan.md).
 */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorRecovery error={error} reset={reset} boundary="root" />;
}
