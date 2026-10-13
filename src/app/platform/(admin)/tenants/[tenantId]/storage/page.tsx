import { TenantStorageView } from "@/modules/platform/ui/features/storage/TenantStorageView";

/** /platform/tenants/[id]/storage — espacio, cuota, depuración y retención del tenant. */
export default async function TenantStoragePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return <TenantStorageView tenantId={tenantId} />;
}
