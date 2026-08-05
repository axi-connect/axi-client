import { Suspense } from "react";
import { AiBadge } from "@/shared/components/features/timeline";
import { FormsSection } from "@/modules/forms/ui/FormsSection";
import { FormsEditorSkeleton } from "@/modules/forms/ui/components/FormsEditorSkeleton";

export const metadata = {
  title: "Formularios de captura",
};

/**
 * Configuración de los formularios de captura (F10): los datos que el agente de
 * IA debe conseguir antes de cerrar un pedido o una cita.
 *
 * El padding y el centrado los aporta el layout del grupo `(content)`
 * (`mx-auto max-w-7xl p-4 md:p-6`) — la página no añade padding propio.
 * `FormsSection` lee `?flow=`, así que va envuelta en Suspense.
 */
export default function IntakeFormsPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Formularios de captura</h1>
          <AiBadge />
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Tu agente pide estos datos por WhatsApp antes de cerrar. Si falta uno obligatorio, no
          cierra la venta.
        </p>
      </header>

      <Suspense fallback={<FormsEditorSkeleton />}>
        <FormsSection />
      </Suspense>
    </div>
  );
}
