import { Suspense } from "react";

import { loadPublicCatalog } from "@/modules/landing/infrastructure/pricing-catalog.loader";
import { SignupFunnelView, SignupSkeleton } from "@/modules/onboarding/ui/signup/SignupFunnelView";

/**
 * El registro muestra los precios de la oferta preseleccionada: lee el MISMO
 * catálogo público que la landing (ISR de un minuto) y lo baja por props. Sin
 * catálogo, la oferta se pinta «a confirmar» y el alta sigue funcionando: la
 * prueba es gratis y el precio se cobra al terminar.
 */
// Literal a propósito: Next exige que la config de segmento sea analizable
// estáticamente (una constante importada rompe el build). Debe coincidir con
// `CATALOG_REVALIDATE_SECONDS` del loader; un spec guardián lo vigila.
export const revalidate = 60;

/** `Suspense` obligatorio: la vista lee `useSearchParams` (preselección de oferta). */
export default async function ComenzarPage() {
  const catalog = await loadPublicCatalog();
  return (
    <Suspense fallback={<SignupSkeleton />}>
      <SignupFunnelView catalog={catalog} />
    </Suspense>
  );
}
