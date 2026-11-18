"use client"

import { ActionConfirmCard } from "@/shared/components/features/assistant"
import type { AppActionsState } from "./use-app-actions"

/**
 * «Pendientes de confirmar» dentro de «Aplicaciones conectadas»: lo que Claude
 * (u otra app) pidió cambiar y quedó esperando a la persona, porque la app no
 * sabe pedir la confirmación por sí misma o la persona cerró el formulario.
 * Es la misma tarjeta de F3 (kit), una por acción, con su origen y su
 * desenlace a la vista tras decidir. No se pinta si no hay nada.
 */
export function PendingAppActions({ state }: { state: AppActionsState }) {
  if (state.visible.length === 0) return null
  const pending = state.visible.filter((action) => action.phase === "pending").length
  return (
    <section aria-labelledby="app-actions-title" className="mb-2 flex flex-col gap-3 pt-1">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="app-actions-title" className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.1em] uppercase">
          Pendientes de confirmar
        </h3>
        {pending > 0 ? (
          <span className="text-muted-foreground text-[12px]">
            {pending === 1 ? "1 por decidir" : `${String(pending)} por decidir`}
          </span>
        ) : null}
      </div>
      <ul className="flex flex-col gap-3">
        {state.visible.map((action) => (
          <li key={action.id}>
            <ActionConfirmCard
              actions={[action]}
              onConfirm={(id) => state.decide(id, "confirm")}
              onReject={(id) => state.decide(id, "reject")}
              onConfirmAll={() => undefined}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
