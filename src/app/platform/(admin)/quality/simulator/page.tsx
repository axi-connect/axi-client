import { Suspense } from "react";
import { TableSkeleton } from "@/shared/components/features/loading";
import { SimulatorView } from "@/modules/platform/ui/features/quality/simulator/SimulatorView";

/** /platform/quality/simulator — nueva sesión de simulacro (rail + formulario). */
export default function PlatformQualitySimulatorPage() {
  // useSearchParams exige Suspense en el App Router (preselección «Nueva sesión igual»)
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <SimulatorView />
    </Suspense>
  );
}
