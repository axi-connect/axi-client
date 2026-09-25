import { Suspense } from "react";
import { RunWizard } from "@/modules/platform/ui/features/quality/runs/wizard/RunWizard";
import { TableSkeleton } from "@/shared/components/features/loading";

/** /platform/quality/runs/new — wizard de nueva ejecución (QA, estrés o probe).
 * Suspense: el wizard lee `useSearchParams` (prellenado desde un dataset). */
export default function PlatformQualityNewRunPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <RunWizard />
    </Suspense>
  );
}
