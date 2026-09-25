import { AuditView } from "@/modules/platform/ui/features/audit/AuditView";
import { SupportSessionsSection } from "@/modules/platform/ui/features/support/SupportSessionsSection";

/**
 * /platform/tenants/[id]/audit — el registro de sesiones de soporte y la
 * auditoría con company_id fijado (selector oculto).
 */
export default async function TenantAuditPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return (
    <div className="space-y-6">
      <SupportSessionsSection tenantId={tenantId} />
      <AuditView companyId={tenantId} lockTenant />
    </div>
  );
}
