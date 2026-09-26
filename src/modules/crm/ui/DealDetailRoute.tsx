"use client";

import { useRouter } from "next/navigation";
import { DealDetailRail } from "./components/DealDetailRail";

/**
 * Adaptador de ruta → panel (patrón OrderDetailRoute). `back` para la ruta
 * interceptada (el atrás del navegador cierra); `replace` para hard-nav
 * (/crm/pipeline/deal/[id] directo, p.ej. desde una notificación).
 *
 * El panel FLOTA sobre el tablero (lienzo CRM premium F1, tablero 4) en vez de
 * encogerlo: en `lg` es una columna de 28 rem a la derecha con sombra de
 * overlay; debajo, ocupa el área entera. El tablero reserva ese ancho con
 * padding para que la tarjeta abierta se deslice a la vista (PipelineBoard).
 * Se ancla al contenedor `relative` de la vista del pipeline.
 */
export function DealDetailRoute({
  dealId,
  closeBehavior,
}: {
  dealId: string;
  closeBehavior: "back" | "replace";
}) {
  const router = useRouter();

  return (
    <div className="absolute inset-0 z-30 flex lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[28rem] lg:p-3">
      <DealDetailRail
        dealId={dealId}
        onClose={() => {
          if (closeBehavior === "back") router.back();
          else router.push("/crm/pipeline");
        }}
      />
    </div>
  );
}
