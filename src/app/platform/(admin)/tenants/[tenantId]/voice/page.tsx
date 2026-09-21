import { TenantVoiceView } from "@/modules/platform/ui/features/tenants/detail/TenantVoiceView";

/** /platform/tenants/[id]/voice — gobierno de la voz del tenant (interruptor, consumo, llave). */
export default async function TenantVoicePage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <TenantVoiceView tenantId={tenantId} />;
}
