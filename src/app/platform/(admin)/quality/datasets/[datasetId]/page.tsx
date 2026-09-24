import { LabelingWorkbench } from "@/modules/platform/ui/features/quality/datasets/labeling/LabelingWorkbench";

/** /platform/quality/datasets/[datasetId] — banco de etiquetado del dataset. */
export default async function PlatformQualityDatasetPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return <LabelingWorkbench datasetId={datasetId} />;
}
