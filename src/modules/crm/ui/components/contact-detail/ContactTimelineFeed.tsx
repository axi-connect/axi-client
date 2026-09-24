"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Calendar,
  ListChecks,
  MessageCircle,
  Route,
  ShoppingCart,
  Target,
  UserRound,
} from "lucide-react";
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
import { CONTACT_STAGE_LABELS, type ContactLifecycleStage } from "@/modules/crm/domain/enums";
import {
  STAGE_KIND_LABELS,
  isRevertibleMove,
  journeyRuleLabel,
  lifecycleSourceLabel,
  type StageKind,
} from "@/modules/crm/domain/journey";
import { useRevertStageChange } from "@/modules/crm/infrastructure/hooks/use-revert-stage-change";
import { subscribeJourneyChanged } from "@/modules/crm/infrastructure/journey-events";
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
  lifecycle: { icon: UserRound, tone: "neutral" },
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

function str(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function isStageKind(value: unknown): value is StageKind {
  return typeof value === "string" && value in STAGE_KIND_LABELS;
}

function isLifecycleStage(value: unknown): value is ContactLifecycleStage {
  return typeof value === "string" && value in CONTACT_STAGE_LABELS;
}

/** El nombre de la etapa destino, o su tipo si el servidor no mandó el nombre. */
function stageLabel(name: unknown, kind: unknown): string | null {
  return str(name) ?? (isStageKind(kind) ? STAGE_KIND_LABELS[kind] : null);
}

/**
 * Las entradas del RECORRIDO se cuentan en primera persona del embudo («Pasó
 * a Propuesta — agente IA · «razón»»), no como «Oportunidad · X — Cambio de
 * etapa»: quien lee el historial quiere saber a dónde fue y quién la llevó.
 * El resto de fuentes conserva el `title — subtitle` del servidor.
 */
function journeyItem(
  entry: TimelineEntryDTO,
): Pick<TimelineItem, "icon" | "tone" | "title" | "description"> | null {
  const payload = entry.payload ?? {};
  if (entry.source === "lifecycle") {
    const from = isLifecycleStage(payload.from_stage) ? CONTACT_STAGE_LABELS[payload.from_stage] : null;
    const to = isLifecycleStage(payload.to_stage) ? CONTACT_STAGE_LABELS[payload.to_stage] : null;
    if (to === null) return null;
    const why = str(payload.reason) ?? lifecycleSourceLabel(str(payload.source_event));
    return {
      icon: UserRound,
      tone: "neutral",
      title: (
        <>
          <span className="font-medium">
            {from === null ? to : `${from} → ${to}`}
          </span>
          {why !== null && <span className="text-muted-foreground"> ({why})</span>}
        </>
      ),
    };
  }
  if (entry.source !== "deals") return null;

  if (entry.type === "deal_stage_changed") {
    const to = stageLabel(payload.to_stage_name, payload.to_kind);
    if (to === null) return null;
    const reason = str(payload.reason);
    const rule = journeyRuleLabel(str(payload.rule_code));
    const actor = payload.actor_type;
    const who =
      actor === "ai_agent"
        ? `agente IA${reason === null ? "" : ` · «${reason}»`}`
        : actor === "system"
          ? rule === null
            ? "regla automática"
            : `regla: ${rule}`
          : reason === null
            ? null
            : `«${reason}»`;
    return {
      icon: Route,
      // Violeta solo cuando la movió la IA: es su color, no el del recorrido.
      tone: actor === "ai_agent" ? "violet" : "neutral",
      title: (
        <>
          <span className="font-medium">Pasó a {to}</span>
          {who !== null && <span className="text-muted-foreground"> — {who}</span>}
        </>
      ),
      description: entryTitle(entry),
    };
  }

  if (entry.type === "deal_stage_reverted") {
    // El paso deshecho iba HACIA la etapa de la que ahora vuelve (`from`).
    const undone = stageLabel(payload.from_stage_name, payload.from_kind);
    return {
      icon: Route,
      tone: "neutral",
      title: (
        <span className="font-medium">
          {undone === null ? "Se deshizo un cambio de etapa" : `Se deshizo el paso a ${undone}`}
        </span>
      ),
      description: entryTitle(entry),
    };
  }
  return null;
}

export function ContactTimelineFeed({
  contactId,
  version = 0,
  compact = false,
  canRevert = false,
  header,
  className,
}: {
  contactId: string;
  /** Cambiarlo re-consulta desde la primera página (refresco por evento WS). */
  version?: number;
  /** Rail estrecho: chips en fila con scroll horizontal en vez de envolver. */
  compact?: boolean;
  /** `crm:manage`: pinta «Deshacer» en los cambios de etapa aún no deshechos. */
  canRevert?: boolean;
  /** Contenido a la izquierda de los chips (título, acciones) en vistas de página. */
  header?: React.ReactNode;
  className?: string;
}) {
  // Tras «Deshacer», el botón desaparece al recargar: el foco vuelve al
  // historial cuando llega la página nueva, no a `<body>` (Q15).
  const rootRef = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);
  const { revert, busy: reverting } = useRevertStageChange({
    onReverted: () => {
      refocus.current = true;
    },
  });
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

  // Un «Deshacer» desde la card «Recorrido» (o desde aquí) cambia el historial
  // de ESTE contacto; el de otro contacto no recarga nada.
  // Si lo deshizo ESTE historial, el foco vuelve a él al recargar (Q15). La
  // raíz no se desmonta al recargar, así que basta con esperar a la carga.
  useEffect(
    () =>
      subscribeJourneyChanged(contactId, () => {
        void load(enabled).then(() => {
          if (!refocus.current) return;
          refocus.current = false;
          rootRef.current?.focus();
        });
      }),
    [contactId, enabled, load],
  );

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

  // Manda `payload.revertible` del servidor (solo el último movimiento no
  // deshecho de un deal abierto lo lleva en true). Lo de abajo es RESPALDO
  // para entradas sin el campo: un `stage_changed` ya deshecho (lo apunta un
  // `stage_reverted` con `reverted_event_id`) o de un deal cerrado no se ofrece.
  const revertedIds = new Set(
    entries
      .map((entry) => (entry.type === "deal_stage_reverted" ? str(entry.payload?.reverted_event_id) : null))
      .filter((id): id is string => id !== null),
  );
  // Una oportunidad ganada o perdida no se mueve: el servidor rechazaría el
  // revert. Las entradas vienen de más nueva a más vieja, así que el PRIMER
  // won/lost/reopened que se ve de cada deal es su estado actual.
  const closedDealIds = new Set<string>();
  const seenStatus = new Set<string>();
  for (const entry of entries) {
    const dealId = str(entry.payload?.deal_id);
    if (dealId === null || seenStatus.has(dealId)) continue;
    if (entry.type === "deal_won" || entry.type === "deal_lost") {
      seenStatus.add(dealId);
      closedDealIds.add(dealId);
    } else if (entry.type === "deal_reopened") {
      seenStatus.add(dealId);
    }
  }

  /* Estructura uniforme entidad + novedad: `title` en bold y `subtitle` en
     secundario — misma forma para toda fuente (contrato D4 del backend). Las
     entradas del recorrido se cuentan a su manera (`journeyItem`). */
  const timelineItems: TimelineItem[] = entries.map((entry) => {
    const journey = journeyItem(entry);
    const payload = entry.payload ?? {};
    const dealId = str(payload.deal_id);
    const eventId = str(payload.event_id) ?? entry.id;
    const serverSays = typeof payload.revertible === "boolean" ? payload.revertible : null;
    const revertible =
      canRevert &&
      entry.type === "deal_stage_changed" &&
      dealId !== null &&
      (serverSays !== null
        ? serverSays
        : !revertedIds.has(eventId) &&
          !closedDealIds.has(dealId) &&
          isRevertibleMove({ rule_code: str(payload.rule_code) }));
    const toName = stageLabel(payload.to_stage_name, payload.to_kind);
    const fromName = stageLabel(payload.from_stage_name, payload.from_kind);
    return {
      id: `${entry.source}-${entry.id}`,
      icon: journey?.icon ?? SOURCE_VISUAL[entry.source].icon,
      tone: journey?.tone ?? SOURCE_VISUAL[entry.source].tone,
      title: journey?.title ?? (
        <>
          <span className="font-medium">{entryTitle(entry)}</span>
          {entry.subtitle && <span className="text-muted-foreground"> — {entry.subtitle}</span>}
        </>
      ),
      description: journey?.description,
      meta: `${TIMELINE_SOURCE_LABELS[entry.source]} · ${relativeTime(entry.occurred_at)}`,
      badge: isAiEntry(entry) ? <AiBadge /> : undefined,
      action: revertible ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-full text-xs"
          disabled={reverting}
          onClick={() =>
            revert({
              contactId,
              dealId,
              eventId,
              toStageName: toName ?? "la etapa",
              fromStageName: fromName,
              byAi: payload.actor_type === "ai_agent",
            })
          }
        >
          Deshacer
        </Button>
      ) : undefined,
    };
  });

  return (
    <div ref={rootRef} tabIndex={-1} role="region" aria-label="Historial del contacto" className={cn("outline-none", className)}>
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
