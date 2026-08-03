import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { BrandMark } from "@/shared/components/ui/brand-mark";

/**
 * 404 de marca (raíz: cubre cualquier ruta sin coincidencia).
 *
 * No existía: un enlace roto mostraba el 404 por defecto de Next. Nótese que
 * para un visitante SIN sesión esta pantalla solo aparece en rutas listadas en
 * `PUBLIC_PATHS`; en cualquier otra, el middleware redirige antes al login
 * (`middleware.ts`). Por eso toda página pública nueva debe registrarse allí.
 *
 * RSC puro: sin `"use client"`, sin animación — es una pantalla de salida, y su
 * único trabajo es devolver al visitante al camino de conversión.
 */
export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] w-full flex-col items-center justify-center px-6 py-24 text-center">
      <BrandMark className="size-16 opacity-90" />

      <p className="text-muted-foreground mt-8 font-mono text-sm tracking-widest">404</p>
      <h1 className="font-heading mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        Esta página no existe
      </h1>
      <p className="text-muted-foreground mt-4 max-w-[52ch] text-base leading-relaxed text-pretty">
        Puede que el enlace esté viejo o que la hayamos movido. Desde aquí puedes
        volver al inicio o escribirnos directamente.
      </p>

      <div className="mt-9 flex flex-wrap justify-center gap-3.5">
        <Button asChild size="lg" className="h-12 px-7 text-base">
          <Link href="/">Volver al inicio</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
          <Link href="/contacto">Hablar con nosotros</Link>
        </Button>
      </div>
    </main>
  );
}
