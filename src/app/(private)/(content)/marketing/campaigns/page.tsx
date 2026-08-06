import type { Metadata } from "next";
import { CampaignsView } from "@/modules/marketing/ui/CampaignsView";

export const metadata: Metadata = { title: "Campañas · Marketing" };

export default function MarketingCampaignsPage() {
  return <CampaignsView />;
}
