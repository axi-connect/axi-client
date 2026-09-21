"use client";

import { ChevronRight, Mic } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import {
  SESSION_STATUS_DOT,
  SESSION_STATUS_LABELS,
  needsAttention,
  type SessionRow,
} from "../../../domain/intake";

/**
 * Una entrevista en la lista.
 *
 * Es una ficha en forma de LISTA, no una tabla: nombre y empresa arriba, una
 * línea secundaria con el contexto, un solo indicador de estado y el avance.
 * Cinco columnas por dato serían desorden — y aquí el dato que hay que leer de
 * un vistazo es «¿esta pide algo de mí?».
 */
export function IntakeSessionRow({ row, onOpen }: { row: SessionRow; onOpen: () => void }) {
  const attention = needsAttention(row);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="truncate">{row.company_name ?? "Empresa sin nombre"}</span>
            {attention ? (
              <span
                className="size-1.5 flex-none rounded-full bg-accent-amber"
                aria-label="Pide atención"
                title="Pide atención"
              />
            ) : null}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {row.invite_name ?? "Sin destinatario"} · {row.blueprint_name}
            {row.last_topic === null ? "" : ` · se quedó en «${row.last_topic}»`}
          </p>
        </div>

        <div className="hidden w-32 flex-none sm:block">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">Avance</span>
            <span className="text-[11px] font-medium tabular-nums">{row.percent}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
            <span
              className="block h-full rounded-full bg-brand-gradient transition-[width] duration-500"
              style={{ width: `${String(row.percent)}%` }}
            />
          </div>
        </div>

        <div className="hidden w-28 flex-none text-right sm:block">
          <p className="flex items-center justify-end gap-1.5 text-[12px]">
            <span
              className={cn("size-1.5 rounded-full", SESSION_STATUS_DOT[row.status])}
              aria-hidden="true"
            />
            {SESSION_STATUS_LABELS[row.status]}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {row.last_activity_at === null ? (
              "Sin abrir"
            ) : (
              <RelativeDate iso={row.last_activity_at} />
            )}
          </p>
        </div>

        <span className="hidden w-16 flex-none items-center justify-end gap-1 text-[11px] text-muted-foreground md:flex">
          <Mic className="size-3" aria-hidden="true" />
          {row.turn_count}
        </span>

        <ChevronRight className="size-4 flex-none text-muted-foreground" aria-hidden="true" />
      </button>
    </li>
  );
}
