import { TenantDatabaseView } from "@/modules/platform/ui/features/tenants/detail/database/TenantDatabaseView";

/** /platform/tenants/[id]/database — DB dedicada + migración de datos. */
export default async function TenantDatabasePage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <TenantDatabaseView tenantId={tenantId} />;
}
