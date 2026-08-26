import { Suspense } from "react";
import type { Metadata } from "next";
import { noindexMetadata } from "@/core/seo/metadata";
import { PaymentReturnView } from "@/modules/billing/ui/PaymentReturnView";

export const metadata: Metadata = noindexMetadata("Confirmando tu pago");

/**
 * Retorno del checkout de Wompi. Es el `redirect-url` que el frontend fija al
 * abrir el pago, y también el que el backend pone en el link de cobranza que
 * viaja en los avisos de mora — de ahí que sea público.
 *
 * `Suspense` porque la vista lee `useSearchParams`: sin él el prerender falla.
 */
export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<ReturnFallback />}>
      <PaymentReturnView />
    </Suspense>
  );
}

function ReturnFallback() {
  return (
    <div
      className="flex flex-col items-center gap-4"
      role="status"
      aria-label="Cargando la confirmación"
      aria-busy="true"
    >
      <span className="border-border border-t-primary size-9 animate-spin rounded-full border-[2.5px] motion-reduce:[animation-duration:2.4s]" />
      <p className="text-muted-foreground text-sm">Un momento…</p>
    </div>
  );
}
