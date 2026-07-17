import { OwnerCredentialsBanner } from "@/modules/platform/ui/features/tenants/detail/OwnerCredentialsBanner";
import { TenantHeader } from "@/modules/platform/ui/features/tenants/detail/TenantHeader";
import { TenantTabs } from "@/modules/platform/ui/features/tenants/detail/TenantTabs";

/**
 * Layout del detalle: header + tabs persisten entre pestañas (segmentos de
 * ruta anidados, spec D11) sin re-fetch — la caché de TanStack los alimenta.
 */
export default async function TenantDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  return (
    <div className="space-y-6">
      <OwnerCredentialsBanner tenantId={tenantId} />
      <TenantHeader tenantId={tenantId} />
      <TenantTabs tenantId={tenantId} />
      {children}
    </div>
  );
}
