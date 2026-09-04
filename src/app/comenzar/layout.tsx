import type { Metadata } from "next";
import Link from "next/link";

import { PublicAnalytics } from "@/core/analytics/ui/PublicAnalytics";
import { noindexMetadata } from "@/core/seo/metadata";
import { BrandLockup } from "@/shared/components/ui/brand-lockup";

/**
 * `/comenzar` — registro autoservicio, de primer nivel: ni `(public)` ni
 * `(private)`, mismo aislamiento que `/pay`. Un funnel no lleva el mega-menú
 * encima ni el shell del panel (que pintaría un sidebar de módulos aún sin
 * configurar). Monta `PublicAnalytics` a propósito: es la superficie de
 * conversión, y la analítica solo puede vivir donde no hay datos de tenants.
 *
 * `noindex`: es una página de proceso, no de contenido; el prefijo está además
 * en `DISALLOWED_PREFIXES` y fuera de `INDEXABLE_ROUTES`.
 */
export const metadata: Metadata = noindexMetadata("Crea tu cuenta");

export default function ComenzarLayout({ children }: { children: React.ReactNode }) {
  // `html` lleva `overflow: hidden` (globals.css) y cada capa monta su propio
  // scroller `data-app-scroll` (público, privado, plataforma). Sin él, en
  // pantallas bajas el formulario quedaba recortado y los botones fuera de
  // alcance. `h-svh` + `overflow-y-auto`: el funnel desplaza dentro del
  // viewport pequeño del móvil, con la barra de marca (`sidebar-scroll`) y el
  // rail lateral `lg:sticky` anclado a este contenedor. `w-full` y no
  // `w-screen`: 100vw incluye la barra y provocaba scroll horizontal.
  return (
    <div data-app-scroll className="bg-brand-ambient sidebar-scroll flex h-svh w-full flex-col overflow-y-auto">
      <PublicAnalytics />
      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-6 py-5">
        {/* El mismo lockup que el header público: el funnel es la continuación
            de la landing y la marca no puede cambiar de tamaño ni de wordmark
            al cruzar a /comenzar. */}
        <BrandLockup />
        <p className="text-muted-foreground text-[0.8125rem]">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/login" className="text-brand font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </header>
      <main className="flex w-full flex-1 flex-col">{children}</main>
    </div>
  );
}
