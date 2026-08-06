import type { Metadata } from "next";
import { PromotionsView } from "@/modules/marketing/ui/PromotionsView";

export const metadata: Metadata = { title: "Promociones · Marketing" };

export default function MarketingPromotionsPage() {
  return <PromotionsView />;
}
