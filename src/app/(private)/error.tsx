"use client";

import { ErrorRecovery } from "@/shared/components/features/error-recovery/ErrorRecovery";

/**
 * Frontera de error del panel. Un `error.tsx` no atrapa el `layout.tsx` de su
 * propio segmento, así que el error de una vista se pinta DENTRO del shell: el
 * sidebar y la cabecera siguen y se puede ir a otro módulo sin recargar
 * (hotfix 2026-10-19, docs/plans/hotfix_application_error_plan.md).
 */
export default function PrivateError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorRecovery error={error} reset={reset} boundary="private" inline />;
}
