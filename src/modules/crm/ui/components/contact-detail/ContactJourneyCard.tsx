"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Pause, Sparkles } from "lucide-react";

import { isHttpError } from "@/core/api/problem";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { formatDayTime, formatMoney, formatShortDate } from "@/core/lib/format";
import { relativeTime } from "@/core/lib/relative-time";
import { useAlert } from "@/core/providers/alert-provider";
import { StatePill } from "@/shared/components/features/bento";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  CADENCE_CHANNEL_LABELS,
  JOURNEY_BADGES,
  STAGE_KIND_BADGES,
  daysInStageLabel,
  isRevertibleMove,
  journeyRuleLabel,
  moverLabel,
  stageDeadline,
  type ContactJourneyDTO,
} from "@/modules/crm/domain/journey";
import { useRevertStageChange } from "@/modules/crm/infrastructure/hooks/use-revert-stage-change";
import { emitJourneyChanged, subscribeJourneyChanged } from "@/modules/crm/infrastructure/journey-events";
import {
  getContactJourney,
  resumeAiMoves,
} from "@/modules/crm/infrastructure/services/journey-service.adapter";

type State =
  | { kind: "loading" }
  | { kind: "ready"; data: ContactJourneyDTO }
  | { kind: "hidden" }
  | { kind: "error"; message: string };

/**
 * «Recorrido» del Contacto 360 (`GET /crm/contacts/:id/journey`): en qué
 * etapa está su oportunidad abierta, cuánto lleva ahí, quién la movió (con
 * «Deshacer» si el movimiento se puede deshacer) y la cadencia en curso. Sin
 * oportunidad, una frase; con varias abiertas (`ambiguous`), otra que manda a
 * Pipeline. Si el servidor responde 404 o 403 la card no se pinta: el
 * recorrido todavía no existe para ese tenant o ese rol.
 *
 * «Pausar cadencia» no existe todavía como endpoint: se anota como deuda y
 * no se pinta un botón que no haga nada.
 */
export function ContactJourneyCard({
  contactId,
  canManage,
  onLoaded,
  className,
}: {
  contactId: string;
  /** `crm:manage`: quien puede deshacer un movimiento. */
  canManage: boolean;
  /**
   * El recorrido leído (o `null` si no existe / falló), para que la isla «Lo
   * próximo» de la ficha lo use sin pedirlo otra vez.
   */
  onLoaded?: (journey: ContactJourneyDTO | null) => void;
  /** El sitio en el bento lo decide la ficha. */
  className?: string;
}) {
  const { showAlert } = useAlert();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Tras «Deshacer», el botón desaparece al recargar: el foco vuelve al
  // encabezado de la card cuando llega el recorrido nuevo, no a `<body>` (Q15).
  const refocus = useRef(false);
  const { revert, busy: reverting } = useRevertStageChange({
    onReverted: () => {
      refocus.current = true;
    },
  });
  const [state, setState] = useState<State>({ kind: "loading" });
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    if (!refocus.current || state.kind === "loading") return;
    refocus.current = false;
    headingRef.current?.focus();
  }, [state]);

  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const load = useCallback(async () => {
    try {
      const data = await getContactJourney(contactId);
      setState({ kind: "ready", data });
      onLoadedRef.current?.(data);
    } catch (err) {
      onLoadedRef.current?.(null);
      if (isHttpError(err) && (err.status === 404 || err.status === 403)) {
        setState({ kind: "hidden" });
        return;
      }
      setState({ kind: "error", message: errorMessage(err, "No se pudo cargar el recorrido") });
    }
  }, [contactId]);

  useEffect(() => {
    void load();
    return subscribeJourneyChanged(contactId, () => void load());
  }, [contactId, load]);

  if (state.kind === "hidden") return null;

  const resume = (dealId: string) => {
    setResuming(true);
    resumeAiMoves(dealId)
      .then(() => {
        showAlert({ tone: "success", title: "Agente reactivado", description: "El agente vuelve a mover la oportunidad." });
        emitJourneyChanged({ contactId, dealId });
      })
      .catch((err: unknown) => {
        showAlert({ tone: "error", title: "No se pudo reanudar", description: errorMessage(err, "Inténtalo de nuevo en un momento.") });
      })
      .finally(() => setResuming(false));
  };

  const dealId = state.kind === "ready" ? (state.data.deal?.id ?? null) : null;

  return (
    <section
      aria-labelledby={`journey-${contactId}`}
      className={cn("flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-5", className)}
    >
      <header className="flex min-h-6 items-center justify-between gap-2">
        <h2
          id={`journey-${contactId}`}
          ref={headingRef}
          tabIndex={-1}
          className="truncate rounded-md font-sans text-xs font-normal text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Recorrido
        </h2>
        {dealId !== null && (
          <Link
            href={`/crm/pipeline/deal/${dealId}`}
            className="inline-flex min-h-6 shrink-0 items-center gap-1 rounded-md text-xs font-medium whitespace-nowrap underline-offset-4 hover:underline"
          >
            Ver en el pipeline
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        )}
      </header>
      {state.kind === "loading" ? (
        <div className="space-y-2" role="status" aria-label="Cargando recorrido">
          <div className="h-7 w-2/3 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-4/5 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : state.kind === "error" ? (
        <div role="alert" className="flex flex-1 flex-col items-start justify-center gap-2">
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : state.data.deal === null || state.data.stage === null ? (
        <p className="text-sm text-pretty text-muted-foreground">
          {state.data.ambiguous
            ? "Tiene varias oportunidades abiertas: el recorrido se sigue desde cada una en Pipeline."
            : "Sin recorrido activo. Se abre solo al detectar intención o al crear una oportunidad."}
        </p>
      ) : (
        <JourneyRows
          data={state.data}
          deal={state.data.deal}
          stage={state.data.stage}
          canManage={canManage}
          busy={reverting || resuming}
          onRevert={(move) =>
            revert({
              contactId,
              dealId: state.data.deal?.id ?? "",
              eventId: move.event_id,
              toStageName: state.data.stage?.name ?? "la etapa",
              // A dónde vuelve si se deshace; `null` (etapa borrada) → «a la etapa anterior».
              fromStageName: state.data.last_move?.from_stage_name ?? null,
              byAi: move.actor_type === "ai_agent",
            })
          }
          onResume={resume}
        />
      )}
    </section>
  );
}

function JourneyRows({
  data,
  deal,
  stage,
  canManage,
  busy,
  onRevert,
  onResume,
}: {
  data: ContactJourneyDTO;
  deal: NonNullable<ContactJourneyDTO["deal"]>;
  stage: NonNullable<ContactJourneyDTO["stage"]>;
  canManage: boolean;
  busy: boolean;
  onRevert: (move: NonNullable<ContactJourneyDTO["last_move"]>) => void;
  onResume: (dealId: string) => void;
}) {
  const deadline = stageDeadline(stage.entered_at, stage.rotting_days);
  const move = data.last_move;
  const cadence = data.cadence;
  const ruleLabel = move === null ? null : journeyRuleLabel(move.rule_code);
  // El servidor manda en `last_move` el último cambio NO deshecho; si además
  // dice `revertible:false` (o la regla es pago/etapa borrada) no hay Deshacer.
  const canRevert = canManage && move !== null && isRevertibleMove(move);

  const stalled = stage.rotting_days !== null && stage.rotting_days > 0 && stage.days_in_stage >= stage.rotting_days;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="min-w-0 truncate font-heading text-2xl leading-tight font-bold" title={stage.name}>
          {stage.name}
        </p>
        <StatePill tone={stalled ? "warning" : "neutral"}>{daysInStageLabel(stage.days_in_stage)}</StatePill>
        <StatusBadge status={stage.stage_kind} map={STAGE_KIND_BADGES} appearance="dot" />
      </div>
      <p className="truncate text-[13px] text-muted-foreground" title={deal.title}>
        Oportunidad «{deal.title}»{deal.value_cents !== null && ` · ${formatMoney(deal.value_cents)}`}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {stage.rotting_days === null
          ? "sin tiempo máximo"
          : `máx. ${String(stage.rotting_days)} ${stage.rotting_days === 1 ? "día" : "días"}${
              deadline === null ? "" : ` · vence el ${formatShortDate(deadline.toISOString())}`
            }`}
      </p>

      {(move !== null || cadence !== null || deal.ai_moves_paused) && (
        <div className="mt-auto space-y-1.5 border-t border-border pt-2.5">
          {move !== null && (
            <div className="flex min-w-0 items-center gap-2">
              {move.actor_type === "ai_agent" && <Sparkles className="size-3.5 shrink-0 text-accent-violet" aria-hidden />}
              <p className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                <span className="sr-only">La movió </span>
                <span className="font-medium text-foreground">{moverLabel(move)}</span>
                {" · "}
                {move.reason ? `«${move.reason}»` : ruleLabel ? `regla: ${ruleLabel}` : null}
                {(move.reason || ruleLabel) && " · "}
                {relativeTime(move.at)}
              </p>
              {canRevert && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 rounded-full px-2.5 text-xs"
                  disabled={busy}
                  onClick={() => onRevert(move)}
                >
                  Deshacer
                </Button>
              )}
            </div>
          )}
          {cadence !== null && (
            <p className="truncate text-xs text-muted-foreground">
              Cadencia · <span className="text-foreground">{`intento ${String(cadence.attempts_used)} de ${String(cadence.max_attempts)}`}</span>
              {" · "}
              {[
                cadence.next_run_at === null ? null : `próximo el ${formatDayTime(cadence.next_run_at)}`,
                CADENCE_CHANNEL_LABELS[cadence.channel].toLowerCase(),
                cadence.enrollment_id === null ? null : "por secuencia",
              ]
                .filter((part): part is string => part !== null)
                .join(" · ")}
            </p>
          )}
          {deal.ai_moves_paused && (
            <div className="flex min-w-0 items-center gap-2">
              <Pause className="size-3.5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <StatusBadge status="ai_paused" map={JOURNEY_BADGES} appearance="dot" />
                <p className="text-xs text-pretty text-muted-foreground">
                  Se pausaron al deshacer un movimiento del agente. Las reglas por evento siguen moviendo lo que tiene un hecho detrás.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-full text-xs"
                disabled={busy}
                onClick={() => onResume(deal.id)}
              >
                Reanudar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
