import type { Metadata } from "next";
import { Suspense } from "react";

import { noindexMetadata } from "@/core/seo/metadata";
import { VerifyEmailView } from "@/modules/onboarding/ui/verify/VerifyEmailView";

/**
 * `/verificar-correo?token=` — destino del enlace del correo de verificación.
 * Pública (en `PUBLIC_PATHS`) y `noindex`: una página con un token en la URL
 * no tiene nada que hacer en un buscador.
 */
export const metadata: Metadata = noindexMetadata("Confirmar correo");

/** `Suspense` obligatorio: la vista lee `useSearchParams`. */
export default function VerificarCorreoPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailView />
    </Suspense>
  );
}
