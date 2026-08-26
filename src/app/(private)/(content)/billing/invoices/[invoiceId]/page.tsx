import type { Metadata } from "next";
import { InvoiceDetailRoute } from "@/modules/billing/ui/InvoiceDetailRoute";

export const metadata: Metadata = { title: "Factura · Facturación" };

/**
 * Página completa del detalle. La sirve una navegación DURA: recarga, enlace
 * compartido o el deep-link de la campanita (`billing.*` → esta ruta). En
 * navegación suave gana el interceptor `@sheet` y el detalle abre como panel.
 */
export default async function BillingInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  return <InvoiceDetailRoute invoiceId={invoiceId} closeBehavior="replace" />;
}
