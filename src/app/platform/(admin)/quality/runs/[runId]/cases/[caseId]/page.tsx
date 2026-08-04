import { CaseDetailView } from "@/modules/platform/ui/features/quality/runs/detail/case/CaseDetailView";

/** /platform/quality/runs/[runId]/cases/[caseId] — transcript + veredicto del case. */
export default async function PlatformQualityCasePage({
  params,
}: {
  params: Promise<{ runId: string; caseId: string }>;
}) {
  const { runId, caseId } = await params;
  return <CaseDetailView runId={runId} caseId={caseId} />;
}
