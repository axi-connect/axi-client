import { DeliveryPage } from "@/modules/platform/ui/features/delivery/DeliveryPage";

/** /platform/tenants/[id]/entrega — «Preparar entrega» (oferta, prueba, citas, correo y vista previa). */
export default async function TenantDeliveryPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <DeliveryPage tenantId={tenantId} />;
}
