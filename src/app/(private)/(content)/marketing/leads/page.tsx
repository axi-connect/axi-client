import type { Metadata } from "next";

import { LeadsInboxView } from "@/modules/prospecting/ui/LeadsInboxView";

export const metadata: Metadata = {
  title: "Captación",
  description: "Prospectos descubiertos y a la espera de entrar a tu CRM.",
};

export default function LeadsPage() {
  return <LeadsInboxView />;
}
