import type { Metadata } from "next";
import Link from "next/link";

import { PublicAnalytics } from "@/core/analytics/ui/PublicAnalytics";
import { noindexMetadata } from "@/core/seo/metadata";
import { BrandMark } from "@/shared/components/ui/brand-mark";

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
  return (
    <div className="bg-brand-ambient flex min-h-svh w-full flex-col">
      <PublicAnalytics />
      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className="font-heading flex items-center gap-2.5 text-base font-bold" aria-label="Axi Connect, ir al inicio">
          <BrandMark className="size-6" />
          Axi Connect
        </Link>
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
