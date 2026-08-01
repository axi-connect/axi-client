"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, ListChecks, MessageCircle, ShoppingCart, Target } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { relativeTime } from "@/core/lib/relative-time";
import { Button } from "@/shared/components/ui/button";
import {
  AiBadge,
  Timeline,
  TimelineSkeleton,
  type TimelineItem,
  type TimelineTone,
} from "@/shared/components/features/timeline";
import {
  TIMELINE_SOURCE_LABELS,
  TIMELINE_SOURCES,
  type TimelineEntryDTO,
  type TimelineSource,
} from "@/modules/crm/domain/contact";
import { getContactTimeline } from "@/modules/crm/infrastructure/services/contacts-service.adapter";

/**
 * Historial 360 multi-fuente del contacto (`GET /crm/contacts/:id/timeline`):
 * chips toggle de fuentes (re-consulta desde cero) + "Cargar más" con cursor
 * opaco. SIN chrome de card, para montarse tanto en una sección de página
 * (`ContactTimeline`) como en el rail de contexto del inbox.
 *
 * Los labels NO se construyen aquí: el backend entrega `title` (entidad) y
 * `subtitle` (novedad) ya en español, con estructura uniforme para toda fuente.
 */

const PAGE_LIMIT = 30;

const SOURCE_VISUAL: Record<
  TimelineSource,
  { icon: React.ComponentType<{ className?: string }>; tone: TimelineTone }
> = {
  activities: { icon: ListChecks, tone: "neutral" },
  deals: { icon: Target, tone: "info" },
  orders: { icon: ShoppingCart, tone: "success" },
  conversations: { icon: MessageCircle, tone: "neutral" },
  appointments: { icon: Calendar, tone: "warning" },
};

/** Entidad del evento; el backend garantiza title salvo shapes legacy. */
function entryTitle(entry: TimelineEntryDTO): string {
  return entry.title?.trim() || TIMELINE_SOURCE_LABELS[entry.source];
}

/** Autoría IA: `activities` la marca con created_by_type, deals/orders con actor_type. */
function isAiEntry(entry: TimelineEntryDTO): boolean {
  const byType = entry.payload?.created_by_type ?? entry.payload?.actor_type;
  return byType === "ai_agent";
}

export function ContactTimelineFeed({
  contactId,
  version = 0,
  compact = false,
  header,
  className,
}: {
  contactId: string;
  /** Cambiarlo re-consulta desde la primera página (refresco por evento WS). */
  version?: number;
  /** Rail estrecho: chips en fila con scroll horizontal en vez de envolver. */
  compact?: boolean;
  /** Contenido a la izquierda de los chips (título, acciones) en vistas de página. */
  header?: React.ReactNode;
  className?: string;
}) {
  const [enabled, setEnabled] = useState<TimelineSource[]>([...TIMELINE_SOURCES]);
  const [entries, setEntries] = useState<TimelineEntryDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Guard anti-race: solo aplica la respuesta de la última consulta lanzada.
  const requestSeq = useRef(0);

  const load = useCallback(
    async (sources: TimelineSource[], nextCursor?: string) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      try {
        const page = await getContactTimeline(contactId, {
          sources,
          cursor: nextCursor,
          limit: PAGE_LIMIT,
        });
        if (seq !== requestSeq.current) return;
        setEntries((prev) => (nextCursor ? [...prev, ...page.data] : page.data));
        setCursor(page.next_cursor ?? null);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        setError(errorMessage(err, "No se pudo cargar el historial"));
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [contactId],
  );

  // `version` fuerza la recarga desde página 1 al llegar un evento del contacto.
  useEffect(() => {
    void load(enabled);
  }, [enabled, load, version]);

  const toggleSource = (source: TimelineSource) => {
    setEntries([]);
    setCursor(null);
    setEnabled((prev) =>
      prev.includes(source)
        ? prev.length > 1
          ? prev.filter((item) => item !== source)
          : prev // siempre queda al menos una fuente activa
        : [...prev, source],
    );
  };

  /* Estructura uniforme entidad + novedad: `title` en bold y `subtitle` en
     secundario — misma forma para toda fuente (contrato D4 del backend). */
  const timelineItems: TimelineItem[] = entries.map((entry) => ({
    id: `${entry.source}-${entry.id}`,
    icon: SOURCE_VISUAL[entry.source].icon,
    tone: SOURCE_VISUAL[entry.source].tone,
    title: (
      <>
        <span className="font-medium">{entryTitle(entry)}</span>
        {entry.subtitle && <span className="text-muted-foreground"> — {entry.subtitle}</span>}
      </>
    ),
    meta: `${TIMELINE_SOURCE_LABELS[entry.source]} · ${relativeTime(entry.occurred_at)}`,
    badge: isAiEntry(entry) ? <AiBadge /> : undefined,
  }));

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {header}
        <div
          className={cn(
            "gap-1.5",
            // En el rail no hay ancho para 5 chips en dos filas: se desplazan.
            compact ? "sidebar-scroll flex w-full overflow-x-auto pb-1" : "flex flex-wrap",
          )}
          role="group"
          aria-label="Fuentes del historial"
        >
          {TIMELINE_SOURCES.map((source) => {
            const active = enabled.includes(source);
            return (
              <button
                key={source}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSource(source)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  compact && "shrink-0",
                  active
                    ? "border-primary/40 bg-accent text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {TIMELINE_SOURCE_LABELS[source]}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 rounded-full"
            onClick={() => void load(enabled)}
          >
            Reintentar
          </Button>
        </div>
      ) : entries.length === 0 && !loading ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Sin eventos para las fuentes seleccionadas.
        </p>
      ) : (
        <Timeline items={timelineItems} className="mt-4" />
      )}

      {loading && <TimelineSkeleton rows={compact ? 4 : 2} className="mt-4" />}

      {cursor !== null && !loading && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => void load(enabled, cursor)}
          >
            Cargar más
          </Button>
        </div>
      )}
    </div>
  );
}
