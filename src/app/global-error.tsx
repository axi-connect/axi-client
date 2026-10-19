"use client";

import "./globals.css";

import { ErrorRecovery } from "@/shared/components/features/error-recovery/ErrorRecovery";

/**
 * Último recurso: lo que lanza el propio layout raíz o uno de sus providers
 * (tema, sesión, avisos, splash). Reemplaza al layout entero, por eso trae su
 * `<html>` y su `<body>` y no cuenta con ningún provider ni con las fuentes de
 * marca. Antes de esto, aquí Next pintaba «Application error: a client-side
 * exception has occurred» (hotfix 2026-10-19,
 * docs/plans/hotfix_application_error_plan.md).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body className="bg-background text-foreground antialiased">
        <ErrorRecovery error={error} reset={reset} boundary="global" />
      </body>
    </html>
  );
}
