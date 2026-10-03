import type { Metadata } from "next";
import { OutreachPolicyView } from "@/modules/marketing/ui/OutreachPolicyView";

export const metadata: Metadata = { title: "Política de contacto · Marketing" };

export default function MarketingOutreachPolicyPage() {
  return <OutreachPolicyView />;
}
