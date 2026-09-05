import { Suspense } from "react";

import { CATALOG_REVALIDATE_SECONDS, loadPublicCatalog } from "@/modules/landing/infrastructure/pricing-catalog.loader";
import { SignupFunnelView, SignupSkeleton } from "@/modules/onboarding/ui/signup/SignupFunnelView";

/**
 * El registro muestra los precios de la oferta preseleccionada: lee el MISMO
 * catálogo público que la landing (ISR de un minuto) y lo baja por props. Sin
 * catálogo, la oferta se pinta «a confirmar» y el alta sigue funcionando: la
 * prueba es gratis y el precio se cobra al terminar.
 */
export const revalidate = CATALOG_REVALIDATE_SECONDS;

/** `Suspense` obligatorio: la vista lee `useSearchParams` (preselección de oferta). */
export default async function ComenzarPage() {
  const catalog = await loadPublicCatalog();
  return (
    <Suspense fallback={<SignupSkeleton />}>
      <SignupFunnelView catalog={catalog} />
    </Suspense>
  );
}
