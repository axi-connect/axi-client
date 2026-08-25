import type { Metadata } from "next";
import { BillingSummaryView } from "@/modules/billing/ui/BillingSummaryView";

export const metadata: Metadata = { title: "Facturación" };

export default function BillingPage() {
  return <BillingSummaryView />;
}
