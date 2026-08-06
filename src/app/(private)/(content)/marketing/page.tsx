import type { Metadata } from "next";
import { MarketingOverviewView } from "@/modules/marketing/ui/MarketingOverviewView";

export const metadata: Metadata = { title: "Marketing" };

export default function MarketingPage() {
  return <MarketingOverviewView />;
}
