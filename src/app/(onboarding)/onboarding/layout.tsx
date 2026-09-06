import type { Metadata } from "next";
import Link from "next/link";

import { AppReadySignal } from "@/core/providers/app-ready-signal";
import { BrandLockup } from "@/shared/components/ui/brand-lockup";

/**
 * Grupo `(onboarding)`: privado (el middleware exige sesión: no está en
 * `PUBLIC_PATHS`) pero FUERA de `(private)`, a propósito. El shell del panel
 * precarga `/me/navigation` y pinta un sidebar de módulos que el usuario aún
 * no configuró: ruido en el momento en que menos hace falta.
 *
 * El escenario es «el suelo» (`.flow-ground`, globals.css; onboarding «Flow»,
 * 2026-09-05): el fondo del panel con la aurora de marca y el MISMO vocabulario
 * de material que el campo coral de `/comenzar`, así la ruta, las fichas y los
 * controles son las mismas piezas sobre los dos escenarios. La bienvenida trae
 * el campo coral como capa encima (`FlowStage`) y lo hunde al empezar.
 *
 * `AppReadySignal` cierra el splash que abrió `/comenzar` al crear la cuenta.
 * `noindex`: defensa en profundidad, como en `(private)`.
 */
export const metadata: Metadata = {
  title: "Configura tu empresa",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // `html` lleva `overflow: hidden` (globals.css) y cada capa monta su propio
  // scroller `data-app-scroll`. Este grupo no lo tenía: en pantallas bajas la
  // bienvenida y los pasos quedaban recortados sin poder desplazarse. `h-svh`
  // + `overflow-y-auto`, con la barra de marca (`sidebar-scroll`); `w-full` y no
  // `w-screen` porque 100vw incluye la barra y provocaba scroll horizontal.
  // `relative isolate`: la capa del campo (bienvenida) se posiciona contra él.
  return (
    <div data-app-scroll className="flow-ground bg-brand-ambient sidebar-scroll relative isolate flex h-svh w-full flex-col overflow-x-hidden overflow-y-auto">
      <AppReadySignal />
      <header className="flex w-full items-center justify-between gap-4 px-6 pt-6 sm:px-10 sm:pt-7">
        <BrandLockup />
        <p className="text-muted-foreground text-[13px] whitespace-nowrap">
          <span className="hidden sm:inline">Tu progreso ya está guardado · </span>
          <Link href="/dashboard" className="text-foreground font-semibold hover:underline">
            Salir al panel
          </Link>
        </p>
      </header>
      <main className="flex w-full flex-1 flex-col">{children}</main>
    </div>
  );
}
