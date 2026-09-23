"use client";

import { useCallback, useEffect, useState } from "react";
import { Route } from "lucide-react";

import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { formatDayTime, formatMoney, formatShortDate } from "@/core/lib/format";
import { relativeTime } from "@/core/lib/relative-time";
import { useAlert } from "@/core/providers/alert-provider";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  CADENCE_CHANNEL_LABELS,
  JOURNEY_BADGES,
  JOURNEY_CHANGED_EVENT,
  STAGE_KIND_BADGES,
  daysInStageLabel,
  journeyRuleLabel,
  moverLabel,
  stageDeadline,
  type ContactJourneyDTO,
} from "@/modules/crm/domain/journey";
import {
  getContactJourney,
  resumeAiMoves,
  revertStageChange,
} from "@/modules/crm/infrastructure/services/journey-service.adapter";

/**
 * Una fila de la ficha: etiqueta → valor, una línea secundaria y, si la hay,
 * UNA acción a la derecha que aparece al pasar el ratón o al enfocar
 * (`hover-reveal`; en táctil siempre). El texto y el botón son hermanos.
 */
function Row({
  label,
  value,
  secondary,
  action,
}: {
  label: string;
  value: React.ReactNode;
  secondary?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <li className="grouped-row group">
      <div className="flex items-center gap-3 px-4 py-2.5 md:hover:bg-foreground/[0.03]">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-medium tabular-nums">
            {value}
          </p>
          {secondary !== undefined && secondary !== null && (
            <p className="text-xs text-muted-foreground tabular-nums">{secondary}</p>
          )}
        </div>
        {action !== undefined && action !== null && (
          <div className="hover-reveal shrink-0">{action}</div>
        )}
      </div>
    </li>
  );
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; data: ContactJourneyDTO }
  | { kind: "hidden" }
  | { kind: "error"; message: string };

/**
 * «Recorrido» del Contacto 360 (`GET /crm/contacts/:id/journey`): en qué
 * etapa está su oportunidad abierta, cuánto lleva ahí, quién la movió (con
 * «Deshacer») y la cadencia en curso. Sin oportunidad, una frase. Si el
 * servidor responde 404 o 403 la card no se pinta: el recorrido todavía no
 * existe para ese tenant o ese rol, y una card vacía no cuenta nada.
 *
 * «Pausar cadencia» no existe todavía como endpoint: se anota como deuda y
 * no se pinta un botón que no haga nada.
 */
export function ContactJourneyCard({
  contactId,
  canManage,
}: {
  contactId: string;
  /** `crm:manage`: quien puede deshacer un movimiento. */
  canManage: boolean;
}) {
  const { showAlert, showModal, closeModal } = useAlert();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setState({ kind: "ready", data: await getContactJourney(contactId) });
    } catch (err) {
      if (isHttpError(err) && (err.status === 404 || err.status === 403)) {
        setState({ kind: "hidden" });
        return;
      }
      setState({ kind: "error", message: errorMessage(err, "No se pudo cargar el recorrido") });
    }
  }, [contactId]);

  useEffect(() => {
    void load();
    const onChanged = () => void load();
    window.addEventListener(JOURNEY_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(JOURNEY_CHANGED_EVENT, onChanged);
  }, [load]);

  if (state.kind === "hidden") return null;

  const revert = (dealId: string, eventId: string, stageName: string, byAi: boolean) => {
    showModal({
      title: `¿Deshacer el paso a ${stageName}?`,
      description: byAi
        ? "La oportunidad vuelve a la etapa anterior y queda en el historial. Los movimientos del agente sobre esta oportunidad quedan en pausa hasta que los reanudes."
        : "La oportunidad vuelve a la etapa anterior y queda en el historial.",
      actions: [
        { label: "Cancelar", variant: "outline" },
        {
          label: "Deshacer",
          variant: "destructive",
          onClick: () => {
            closeModal();
            setBusy(true);
            revertStageChange(dealId, eventId)
              .then(() => {
                showAlert({ tone: "success", title: "Movimiento deshecho", autoCloseMs: 2000, open: true });
                window.dispatchEvent(new CustomEvent(JOURNEY_CHANGED_EVENT));
              })
              .catch((err: unknown) => {
                showAlert({ tone: "error", title: errorMessage(err, "No se pudo deshacer"), open: true });
              })
              .finally(() => setBusy(false));
          },
        },
      ],
    });
  };

  const resume = (dealId: string) => {
    setBusy(true);
    resumeAiMoves(dealId)
      .then(() => {
        showAlert({ tone: "success", title: "El agente vuelve a mover la oportunidad", autoCloseMs: 2000, open: true });
        window.dispatchEvent(new CustomEvent(JOURNEY_CHANGED_EVENT));
      })
      .catch((err: unknown) => {
        showAlert({ tone: "error", title: errorMessage(err, "No se pudo reanudar"), open: true });
      })
      .finally(() => setBusy(false));
  };

  return (
    <section className="rounded-2xl border border-border bg-background p-4 md:p-6">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Route className="size-4 text-muted-foreground" aria-hidden />
        Recorrido
      </h3>

      {state.kind === "loading" ? (
        <div className="mt-3 space-y-2" role="status" aria-label="Cargando recorrido">
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : state.kind === "error" ? (
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <Button variant="outline" size="sm" className="mt-2 rounded-full" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : state.data.deal === null || state.data.stage === null ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Sin recorrido activo. Se abre solo al detectar intención o al crear una oportunidad.
        </p>
      ) : (
        <JourneyRows
          data={state.data}
          deal={state.data.deal}
          stage={state.data.stage}
          canManage={canManage}
          busy={busy}
          onRevert={revert}
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
  onRevert: (dealId: string, eventId: string, stageName: string, byAi: boolean) => void;
  onResume: (dealId: string) => void;
}) {
  const deadline = stageDeadline(stage.entered_at, stage.rotting_days);
  const move = data.last_move;
  const cadence = data.cadence;
  const ruleLabel = move === null ? null : journeyRuleLabel(move.rule_code);

  return (
    <ul className="grouped-list -mx-4 mt-2 md:-mx-6">
      <Row
        label="Etapa"
        value={
          <>
            <span>{stage.name}</span>
            <StatusBadge status={stage.stage_kind} map={STAGE_KIND_BADGES} appearance="dot" />
          </>
        }
        secondary={
          <>
            Oportunidad «{deal.title}»
            {deal.value_cents !== null && ` · ${formatMoney(deal.value_cents)}`}
          </>
        }
      />
      <Row
        label="En la etapa"
        value={daysInStageLabel(stage.days_in_stage)}
        secondary={
          stage.rotting_days === null
            ? "sin tiempo máximo"
            : `máx. ${String(stage.rotting_days)} ${stage.rotting_days === 1 ? "día" : "días"}${
                deadline === null ? "" : ` · vence el ${formatShortDate(deadline.toISOString())}`
              }`
        }
      />
      {move !== null && (
        <Row
          label="La movió"
          value={moverLabel(move)}
          secondary={
            <>
              {move.reason ? `«${move.reason}»` : ruleLabel ? `regla: ${ruleLabel}` : null}
              {(move.reason || ruleLabel) && " · "}
              {relativeTime(move.at)}
            </>
          }
          action={
            canManage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full text-xs"
                disabled={busy}
                onClick={() => onRevert(deal.id, move.event_id, stage.name, move.actor_type === "ai_agent")}
              >
                Deshacer
              </Button>
            ) : undefined
          }
        />
      )}
      {cadence !== null && (
        <Row
          label="Cadencia"
          value={`intento ${String(cadence.attempts_used)} de ${String(cadence.max_attempts)}`}
          secondary={[
            cadence.next_run_at === null ? null : `próximo el ${formatDayTime(cadence.next_run_at)}`,
            CADENCE_CHANNEL_LABELS[cadence.channel],
            cadence.enrollment_id === null ? null : "por secuencia",
          ]
            .filter((part): part is string => part !== null)
            .join(" · ")}
        />
      )}
      {deal.ai_moves_paused && (
        <Row
          label="Movimientos de la IA"
          value={<StatusBadge status="ai_paused" map={JOURNEY_BADGES} appearance="dot" />}
          secondary="Se pausaron al deshacer un movimiento del agente. Las reglas por evento siguen moviendo lo que tiene un hecho detrás."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              disabled={busy}
              onClick={() => onResume(deal.id)}
            >
              Reanudar
            </Button>
          }
        />
      )}
    </ul>
  );
}
