import type { Metadata } from "next";
import { CampaignDetailView } from "@/modules/marketing/ui/CampaignDetailView";

export const metadata: Metadata = { title: "Campaña · Marketing" };

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return <CampaignDetailView campaignId={campaignId} />;
}
