import { TenantFeaturesView } from "@/modules/platform/ui/features/tenants/detail/TenantFeaturesView";

/** /platform/tenants/[id]/features — overrides de plataforma (F1 Cobros). */
export default async function TenantFeaturesPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <TenantFeaturesView tenantId={tenantId} />;
}
