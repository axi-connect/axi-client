"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { X } from "lucide-react";

import { ProposalDetail } from "./ProposalDetail";

/**
 * El detalle de propuesta como rail derecho interceptado.
 *
 * Ruta propia y no estado local: la URL es compartible («mira esto que propuso
 * Axel») y el back del navegador cierra, que es lo que la gente intenta primero.
 * Es el mismo patrón del deal del CRM y de la cita de agenda.
 *
 * `closeBehavior="back"` en la navegación soft y una vuelta a `/cmo` en la
 * dura: si alguien abre el enlace en una pestaña nueva no hay historial al que
 * volver, y un botón de cerrar que no hace nada es peor que no tenerlo.
 */
export function ProposalSheetRoute({
  proposalId,
  closeBehavior = "back",
}: {
  proposalId: string;
  closeBehavior?: "back" | "push";
}) {
  const router = useRouter();

  const close = () => {
    if (closeBehavior === "back") router.back();
    else router.push("/cmo");
  };

  // Escape cierra: es un panel superpuesto y la expectativa es la de un modal.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
    // `close` es estable dentro de un render; recrearla no cambia el efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeBehavior]);

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-label="Detalle de la propuesta"
      className="relative flex w-full max-w-[580px] flex-none flex-col border-l border-border bg-background shadow-overlay"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Cerrar"
        className="absolute top-4 right-4 z-10 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      <ProposalDetail proposalId={proposalId} />
    </aside>
  );
}
