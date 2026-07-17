import { TenantUsersView } from "@/modules/platform/ui/features/tenants/detail/TenantUsersView";

/** /platform/tenants/[id]/users — usuarios del tenant (read-only). */
export default async function TenantUsersPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <TenantUsersView tenantId={tenantId} />;
}
