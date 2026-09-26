import type { Metadata } from "next";
import { CampaignWizard } from "@/modules/marketing/ui/CampaignWizard";

export const metadata: Metadata = { title: "Nueva campaña · Marketing" };

/**
 * `?campaign=<id>` retoma un borrador (o edita una programada) donde se quedó.
 * La `key` remonta el asistente al pasar de una campaña a otra.
 */
export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const { campaign } = await searchParams;
  return <CampaignWizard key={campaign ?? "nueva"} resumeId={campaign ?? null} />;
}
