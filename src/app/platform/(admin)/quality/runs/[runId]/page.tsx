import { RunDetailView } from "@/modules/platform/ui/features/quality/runs/detail/RunDetailView";

/** /platform/quality/runs/[runId] — detalle en vivo de una ejecución. */
export default async function PlatformQualityRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  return <RunDetailView runId={runId} />;
}
