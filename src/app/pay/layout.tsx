import type { Metadata } from "next";
import { noindexMetadata } from "@/core/seo/metadata";

/**
 * Superficie de pago SIN sesión, de primer nivel: ni `(public)` ni `(private)`,
 * así que hereda solo el layout raíz (fuentes y providers) — mismo aislamiento
 * que `/platform`.
 *
 * Aquí aterrizan dos cosas: el retorno del checkout de Wompi, y el enlace de
 * pago de una factura. A las dos llega gente **sin sesión**, incluido un tenant
 * ya suspendido, así que no puede haber shell de panel ni de marketing: el
 * primero lo mandaría al login y el segundo le pondría un menú comercial encima
 * de una pantalla de pago.
 *
 * `noindex`: la URL lleva un token de un solo recurso y no tiene nada que hacer
 * en un buscador. El prefijo está además en `DISALLOWED_PREFIXES` (robots.txt) y
 * fuera de `INDEXABLE_ROUTES` (sitemap).
 */
export const metadata: Metadata = noindexMetadata("Pago");

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background flex min-h-svh w-full flex-col items-center justify-center px-6 py-12">
      {children}
    </main>
  );
}
