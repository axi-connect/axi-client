"use client";

import { LoaderCircle, RotateCw, Trash2, X } from "lucide-react";

import { RelativeDate } from "@/shared/components/ui/relative-date";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { StatusBadge } from "@/shared/components/features/status-badge";

import {
  costOf,
  isInFlight,
  progressOf,
  queryOf,
  SEARCH_STATUS_MAP,
  summaryOf,
  type SearchDTO,
} from "../../domain/search";

/**
 * Una ejecución de búsqueda.
 *
 * Las cifras se leen de izquierda a derecha como se piensa el resultado:
 * cuántos aparecieron, cuántos sirven de verdad, y cuánto costó. El costo va
 * junto al estado y no escondido en un detalle — es la mitad de la decisión de
 * repetirla.
 */
export function SearchRun({
  search,
  onRepeat,
  onCancel,
  onDelete,
  deleting = false,
}: {
  search: SearchDTO;
  onRepeat?: (search: SearchDTO) => void;
  onCancel?: (search: SearchDTO) => void;
  /** Solo con `leads:delete`. Sin el prop, el botón no existe. */
  onDelete?: (search: SearchDTO) => void;
  deleting?: boolean;
}) {
  const live = isInFlight(search);
  const pct = Math.round(progressOf(search) * 100);

  return (
    <article className="border-border/60 border-b py-5 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">
            {search.label ?? queryOf(search)}
          </h3>
          <p className="text-muted-foreground mt-0.5 truncate text-sm">
            {queryOf(search)} · hasta {search.params.limit.toLocaleString("es-CO")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-muted-foreground text-sm tabular-nums">
            {costOf(search)}
          </span>
          <StatusBadge status={search.status} map={SEARCH_STATUS_MAP} />
          {/* Parar es de las pocas cosas del panel que gasta dinero sola: quien
              se da cuenta de que puso mal la categoría tiene que poder cortar. */}
          {live && onCancel !== undefined && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCancel(search)}
              aria-label={`Detener «${search.label ?? queryOf(search)}»`}
            >
              <X aria-hidden="true" />
              Detener
            </Button>
          )}
          {!live && onRepeat !== undefined && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRepeat(search)}
              aria-label={`Repetir «${search.label ?? queryOf(search)}»`}
            >
              <RotateCw aria-hidden="true" />
              Repetir
            </Button>
          )}
          {/* DE CONTORNO y no relleno: al lado de las otras acciones, un botón
              rojo macizo se lee como la acción principal de la tarjeta, y aquí
              la principal es repetir. El relleno rojo va en el diálogo. */}
          {onDelete !== undefined && (
            <Button
              size="sm"
              variant="outline"
              disabled={deleting}
              onClick={() => onDelete(search)}
              className="border-destructive/45 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Eliminar «${search.label ?? queryOf(search)}» y sus leads`}
            >
              {deleting ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <Progress
        className="mt-3"
        value={pct}
        aria-label={`Progreso de la búsqueda: ${String(pct)}%`}
      />

      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {/* «Trajo» y no «tiene»: el contador es HISTÓRICO y no se ajusta al
            borrar o promover leads. Es la única forma de explicar en qué se
            gastó el dinero, así que si chirría se arregla la etiqueta y no el
            número. */}
        <span className="text-foreground font-medium tabular-nums">
          Trajo {search.found_count.toLocaleString("es-CO")}
        </span>
        <span>{summaryOf(search)}</span>
        {search.finished_at !== null && (
          <RelativeDate iso={search.finished_at} className="ml-auto" />
        )}
      </div>

      {search.status === "partial" && (
        // El aviso honesto: no es un adorno, es lo que evita que el dueño crea
        // que ya tiene una lista con la que llamar a alguien. Con filtros el
        // motivo lo escribe el backend, porque solo él sabe si paró por el techo
        // de gasto, por agotarse la zona o por el tope de páginas.
        <p className="border-warning/40 bg-warning/10 text-foreground mt-3 rounded-md border px-3 py-2 text-sm">
          {search.error ??
            "La mayoría de estos negocios llegaron sin teléfono ni correo. Necesitan enriquecimiento para servir de algo."}
        </p>
      )}

      {search.error !== null && (
        <p className="text-destructive mt-3 text-sm">{search.error}</p>
      )}
    </article>
  );
}
