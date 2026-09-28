import type { Metadata } from "next";
import { CampaignWizard } from "@/modules/marketing/ui/CampaignWizard";
import { presetFromSearchParams } from "@/modules/marketing/domain/campaign-draft";

export const metadata: Metadata = { title: "Nueva campaña · Marketing" };

/**
 * `?campaign=<id>` retoma un borrador (o edita una programada) donde se quedó.
 * `?audience=contacts|import|segment&…` (F6) abre el asistente con la audiencia
 * ya decidida en el CRM («Enviar plantilla»). La `key` remonta el asistente al
 * pasar de una campaña a otra.
 */
export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const campaign = params.campaign;
  const preset = campaign === undefined ? presetFromSearchParams(params) : null;
  return <CampaignWizard key={campaign ?? "nueva"} resumeId={campaign ?? null} preset={preset} />;
}
