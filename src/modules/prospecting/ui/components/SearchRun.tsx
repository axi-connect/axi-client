"use client";

import { LoaderCircle, RotateCw, Trash2, X } from "lucide-react";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
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
  searchNotice,
  summaryOf,
  type SearchDTO,
} from "../../domain/search";
import type { StatusTone } from "@/shared/components/features/status-badge/types";

/**
 * Del tono de estado a la variante del callout del sistema.
 *
 * Es la única traducción que hace falta, y vive aquí porque `Alert` es del
 * sistema y `StatusTone` del dominio. `neutral` cae en `default`: superficie de
 * tarjeta y texto normal, que es lo que se quiere para una nota sin carga.
 */
const NOTICE_VARIANT: Record<StatusTone, "default" | "destructive" | "success" | "warning" | "info"> = {
  success: "success",
  warning: "warning",
  destructive: "destructive",
  info: "info",
  neutral: "default",
};

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
  const notice = searchNotice(search);

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

      {/* UN aviso, no dos. Antes había dos bloques —uno por `partial` y otro por
          `error`— y una parcial con motivo caía en los dos, así que el mismo
          texto salía repetido en ámbar y en rojo. Qué se dice y con qué tono lo
          decide `searchNotice`, que lee el tono del mismo mapa que la insignia. */}
      {notice !== null && (
        <Alert variant={NOTICE_VARIANT[notice.tone]} className="mt-3">
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}
    </article>
  );
}
