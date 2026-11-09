import type { Metadata } from "next";
import { SocialView } from "@/modules/social/ui/SocialView";

export const metadata: Metadata = { title: "Redes · Marketing" };

export default function MarketingSocialPage() {
  return <SocialView />;
}
