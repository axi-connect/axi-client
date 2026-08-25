import type { Metadata } from "next"

import { noindexMetadata } from "@/core/seo/metadata"

/**
 * `noindex` para todo `/auth/*`. Va en el layout y no en cada página porque
 * `/auth/logout` es `"use client"` y no puede exportar `metadata`.
 *
 * No es redundante con el middleware: `/auth` SÍ es público (hay que poder
 * llegar al login), así que sin esta directiva Google indexaría la pantalla de
 * inicio de sesión y competiría con la home en las búsquedas de marca.
 */
export const metadata: Metadata = noindexMetadata("Inicia sesión")

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background flex min-h-screen w-full flex-col items-center justify-center sm:px-4">
      <div className="w-full sm:max-w-md">
        {children}
      </div>
    </main>
  )
}