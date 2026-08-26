import { TenantBillingView } from "@/modules/platform/ui/features/billing/TenantBillingView";

/** /platform/tenants/[id]/billing — cuenta de cobro, avisos y fecha de corte. */
export default async function TenantBillingPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <TenantBillingView tenantId={tenantId} />;
}
