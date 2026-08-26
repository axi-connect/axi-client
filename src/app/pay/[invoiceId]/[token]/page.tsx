import type { Metadata } from "next";
import { noindexMetadata } from "@/core/seo/metadata";
import { PublicInvoiceView } from "@/modules/billing/ui/PublicInvoiceView";

export const metadata: Metadata = noindexMetadata("Pagar factura");

/**
 * Pago de una factura sin sesión. Es la vía del tenant suspendido y la del
 * contador al que le comparten el enlace.
 *
 * El token viaja en el path y no se toca aquí: la vista lo pasa tal cual a la
 * API, que es la única que puede validarlo. El backend lo enmascara en sus logs
 * (`mask_url_secrets.ts`).
 */
export default async function PublicPayPage({
  params,
}: {
  params: Promise<{ invoiceId: string; token: string }>;
}) {
  const { invoiceId, token } = await params;
  return <PublicInvoiceView invoiceId={invoiceId} token={token} />;
}
