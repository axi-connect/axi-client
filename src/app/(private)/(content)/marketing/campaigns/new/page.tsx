import type { Metadata } from "next";
import { CampaignWizard } from "@/modules/marketing/ui/CampaignWizard";
import { presetFromSearchParams } from "@/modules/marketing/domain/campaign-draft";

export const metadata: Metadata = { title: "Nueva campaña · Marketing" };

/**
 * `?campaign=<id>` retoma un borrador (o edita una programada) donde se quedó.
 * `?audience=import|segment&…` (F6) abre el asistente con la audiencia ya
 * decidida en el CRM («Enviar plantilla»); una lista marcada llega por
 * `?preset=<clave>` de sessionStorage. La `key` remonta el asistente al pasar
 * de una campaña a otra.
 */
export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const campaign = params.campaign;
  const preset = campaign === undefined ? presetFromSearchParams(params) : null;
  // `?preset=<clave>`: una lista marcada, guardada en sessionStorage por el CRM (C2).
  const presetKey = campaign === undefined ? (params.preset ?? null) : null;
  return <CampaignWizard key={campaign ?? presetKey ?? "nueva"} resumeId={campaign ?? null} preset={preset} presetKey={presetKey} />;
}
