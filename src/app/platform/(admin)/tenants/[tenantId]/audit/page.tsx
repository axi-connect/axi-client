import { AuditView } from "@/modules/platform/ui/features/audit/AuditView";

/** /platform/tenants/[id]/audit — auditoría con company_id fijado (selector oculto). */
export default async function TenantAuditPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <AuditView companyId={tenantId} lockTenant />;
}
