import type { Metadata } from "next";
import { InvoicesView } from "@/modules/billing/ui/InvoicesView";

export const metadata: Metadata = { title: "Facturas · Facturación" };

export default function BillingInvoicesPage() {
  return <InvoicesView />;
}
