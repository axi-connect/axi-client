import { TenantSummary } from "@/modules/platform/ui/features/tenants/detail/TenantSummary";

/** /platform/tenants/[id] — tab Resumen. */
export default async function TenantSummaryPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <TenantSummary tenantId={tenantId} />;
}
