"use client";

import { use } from "react";
import { InvoiceDetailRoute } from "@/modules/billing/ui/InvoiceDetailRoute";

/** Navegación suave a /billing/invoices/[id]: el detalle abre como panel lateral. */
export default function InterceptedInvoiceDetail({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  return <InvoiceDetailRoute invoiceId={invoiceId} closeBehavior="back" />;
}
