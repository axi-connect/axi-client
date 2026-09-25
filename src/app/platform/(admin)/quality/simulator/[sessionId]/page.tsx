import { Suspense } from "react";
import { TableSkeleton } from "@/shared/components/features/loading";
import { SimulatorView } from "@/modules/platform/ui/features/quality/simulator/SimulatorView";

/** /platform/quality/simulator/[sessionId] — una sesión de simulacro en vivo. */
export default async function PlatformQualitySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <SimulatorView sessionId={sessionId} />
    </Suspense>
  );
}
