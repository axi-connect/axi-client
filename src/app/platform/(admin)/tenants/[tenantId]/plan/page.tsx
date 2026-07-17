import { TenantPlanView } from "@/modules/platform/ui/features/tenants/detail/TenantPlanView";

/** /platform/tenants/[id]/plan — plan vigente y límites efectivos. */
export default async function TenantPlanPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <TenantPlanView tenantId={tenantId} />;
}
