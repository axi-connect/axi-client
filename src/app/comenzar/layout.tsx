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
 *
 * El escenario es «el campo» (`.signup-field`, globals.css; mockup v3 «Flow»,
 * 2026-09-05): fondo de marca a sangre que re-deriva los tokens semánticos, así
 * el lockup, los controles y los textos de dentro adoptan el material sin
 * variantes. La retícula (`.signup-grain`) es la única textura.
 */
export const metadata: Metadata = noindexMetadata("Crea tu cuenta");

export default function ComenzarLayout({ children }: { children: React.ReactNode }) {
  // `html` lleva `overflow: hidden` (globals.css) y cada capa monta su propio
  // scroller `data-app-scroll` (público, privado, plataforma). Sin él, en
  // pantallas bajas el formulario quedaba recortado y los botones fuera de
  // alcance. `h-svh` + `overflow-y-auto`: el funnel desplaza dentro del
  // viewport pequeño del móvil, con la barra de marca (`sidebar-scroll`). `w-full`
  // y no `w-screen`: 100vw incluye la barra y provocaba scroll horizontal.
  return (
    <div data-app-scroll className="signup-field sidebar-scroll relative isolate flex h-svh w-full flex-col overflow-x-hidden overflow-y-auto">
      <div aria-hidden="true" className="signup-grain pointer-events-none absolute inset-0 -z-10" />
      <PublicAnalytics />
      <header className="flex w-full items-center justify-between gap-4 px-6 pt-6 sm:px-10 sm:pt-7">
        {/* El mismo lockup que el header público: isotipo a color y, por CSS
            (`.signup-field .text-brand-wordmark`), el wordmark en el color del
            texto del campo. Sin variantes en el componente. */}
        <BrandLockup />
        <p className="text-muted-foreground text-[13px] whitespace-nowrap">
          <span className="hidden sm:inline">¿Ya tienes cuenta? </span>
          <Link href="/auth/login" className="text-foreground font-semibold hover:underline">
            Inicia sesión
          </Link>
        </p>
      </header>
      <main className="flex w-full flex-1 flex-col">{children}</main>
    </div>
  );
}
