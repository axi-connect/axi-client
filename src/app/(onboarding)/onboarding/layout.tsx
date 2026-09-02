import type { Metadata } from "next";

import { AppReadySignal } from "@/core/providers/app-ready-signal";

/**
 * Grupo `(onboarding)`: privado (el middleware exige sesión: no está en
 * `PUBLIC_PATHS`) pero FUERA de `(private)`, a propósito. El shell del panel
 * precarga `/me/navigation` y pinta un sidebar de módulos que el usuario aún
 * no configuró: ruido en el momento en que menos hace falta. El cromo propio
 * lo pone `OnboardingShell`.
 *
 * `AppReadySignal` cierra el splash que abrió `/comenzar` al crear la cuenta.
 * `noindex`: defensa en profundidad, como en `(private)`.
 */
export const metadata: Metadata = {
  title: "Configura tu empresa",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppReadySignal />
      {children}
    </>
  );
}
