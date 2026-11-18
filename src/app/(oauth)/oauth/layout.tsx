import type { Metadata } from "next"

import { AppReadySignal } from "@/core/providers/app-ready-signal"
import { BrandLockup } from "@/shared/components/ui/brand-lockup"

/**
 * Grupo `(oauth)` (F5 «Axel OS»): la pantalla donde la persona autoriza a una
 * app MCP (Claude…) a usar su cuenta. Privado —el middleware exige sesión y,
 * si no la hay, manda al login con `next` y vuelve aquí— pero FUERA de
 * `(private)`: el shell del panel (sidebar, `/me/navigation`) sobra en una
 * pantalla de un solo paso a la que se llega desde otra app.
 *
 * Mismo escenario que `(onboarding)`: scroller propio (`data-app-scroll`,
 * `html` lleva `overflow: hidden`) y la aurora de marca. `noindex`.
 */
export const metadata: Metadata = {
  title: "Conectar una app",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export default function OauthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-app-scroll
      className="bg-brand-ambient sidebar-scroll relative isolate flex h-svh w-full flex-col overflow-x-hidden overflow-y-auto"
    >
      <AppReadySignal />
      <header className="flex w-full items-center px-6 pt-6 sm:px-10 sm:pt-7">
        <BrandLockup />
      </header>
      <main className="flex w-full flex-1 flex-col">{children}</main>
    </div>
  )
}
