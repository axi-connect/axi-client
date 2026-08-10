import type { Metadata } from "next";
import { AutomationsView } from "@/modules/marketing/ui/AutomationsView";

export const metadata: Metadata = { title: "Recuperación · Marketing" };

export default function MarketingAutomationsPage() {
  return <AutomationsView />;
}
