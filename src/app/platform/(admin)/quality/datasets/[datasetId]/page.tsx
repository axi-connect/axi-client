import { Suspense } from "react";
import { LabelingWorkbench } from "@/modules/platform/ui/features/quality/datasets/labeling/LabelingWorkbench";
import { TableSkeleton } from "@/shared/components/features/loading";

/** /platform/quality/datasets/[datasetId] — banco de etiquetado del dataset.
 * Suspense: el banco lee `useSearchParams` (`?importing=1`). */
export default async function PlatformQualityDatasetPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <LabelingWorkbench datasetId={datasetId} />
    </Suspense>
  );
}
