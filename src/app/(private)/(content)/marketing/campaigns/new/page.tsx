import type { Metadata } from "next";
import { CampaignWizard } from "@/modules/marketing/ui/CampaignWizard";

export const metadata: Metadata = { title: "Nueva campaña · Marketing" };

export default function NewCampaignPage() {
  return <CampaignWizard />;
}
