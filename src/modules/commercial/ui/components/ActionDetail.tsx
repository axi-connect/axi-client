"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight, Check, Info, TriangleAlert } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatInteger } from "@/core/lib/commercial-units";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import type { CommercialApprovalResultDTO, CommercialProposalDTO, SourceKind } from "@/modules/commercial/domain/commercial";
import { AFTER_APPROVAL_NOTE, AFTER_APPROVED_NOTE, NOTHING_APPLIED_NOTE, REJECTED_MESSAGE, REJECT_NOTE } from "@/modules/commercial/domain/copy";
import {
  approvalLines,
  approvalTookEffect,
  approvedOnPhrase,
  expiryPhrase,
  MIN_REJECT_REASON,
  OUTREACH_CHANNEL_LABELS,
  OUTREACH_DESTINATIONS,
  OUTREACH_TYPE_LABELS,
  proposalHeadline,
  readOutreach,
  REJECT_REASONS,
  startDatePhrase,
  startPhrase,
  type OutreachPlan,
} from "@/modules/commercial/domain/proposals";
import { PROPOSAL_BADGES } from "@/modules/commercial/domain/labels";
import { isStaleDecision, useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { useApproveAccess } from "@/modules/commercial/ui/hooks/use-approve-access";
import { StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";

import { SheetList, SheetRow } from "./SheetList";
import { SourceMark } from "./SourceMark";

const OTHER = "__other__";
const SOURCES: readonly string[] = ["history", "declared", "benchmark"];

/**
 * La acción propuesta, abierta: donde el dueño decide (vistas 5, 14 y 15 del
 * mockup). Anatomía fija —tipo y vencimiento, título y titular, «Por qué
 * ahora», «Qué va a pasar», «Después»— porque cada bloque responde la
 * pregunta que viene a continuación.
 *
 * El resultado de aprobar separa lo aplicado de lo que falló y lo dice en
 * contactos, no en tareas: «Listo. 36 contactos entran en seguimiento mañana a
 * las 9:00.» / «2 quedaron fuera (2 baja comercial).». Aprobar desde la lista
 * también llega aquí: el resultado vive en el store por id.
 *
 * Sin `commercial:approve` o sin la capacidad `crm_ai` es de solo lectura,
 * con la línea de a quién pedírselo (`useApproveAccess`). Una aprobada cuyo
 * resultado esta sesión no tiene (se aprobó en otra pestaña, otro día) se
 * dice en PASADO con lo que el servidor devuelve: fecha, artefactos y estado.
 *
 * `onStale` se llama cuando el servidor dice que la propuesta ya no está como
 * se pinta (409 decidida por otro, 403): la ruta la vuelve a leer (C4).
 *
 * Devuelve cuerpo y pie por separado para que la ruta los monte en UN solo
 * `DetailSheet` (cuerpo con scroll, pie fijo).
 */
export function useActionDetail(proposalId: string, proposal: CommercialProposalDTO | null, onStale?: () => void) {
  const { showAlert } = useAlert();
  const access = useApproveAccess();
  const approve = useCommercialStore((state) => state.approveProposal);
  const reject = useCommercialStore((state) => state.rejectProposal);
  const stored = useCommercialStore((state) => state.approvals[proposalId] ?? null);
  const decision = useCommercialStore((state) => state.decisions[proposalId] ?? null);

  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<string>(REJECT_REASONS[0]);
  const [custom, setCustom] = useState("");

  const status = decision?.status ?? proposal?.status ?? "pending";
  // Un «nada se aplicó» solo se pinta mientras siga por decidir (V3).
  const result = stored !== null && stored.status === "pending" && status !== "pending" ? null : stored;
  const decidedAt = decision?.decided_at ?? proposal?.decided_at ?? null;
  const { canApprove, readOnlyMessage } = access;
  const plans = proposal === null ? [] : readOutreach(proposal.artifacts, proposal.created_at);
  const effectiveReason = reason === OTHER ? custom.trim() : reason;
  const reasonValid = reason !== OTHER || effectiveReason.length >= MIN_REJECT_REASON;

  const onApprove = async () => {
    setBusy(true);
    try {
      await approve(proposalId);
    } catch (error: unknown) {
      showAlert({ tone: "error", title: "No se pudo aprobar", description: errorMessage(error) });
      if (isStaleDecision(error)) onStale?.();
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    if (!reasonValid) return;
    setBusy(true);
    try {
      await reject(proposalId, effectiveReason === "" ? undefined : effectiveReason);
      setRejecting(false);
    } catch (error: unknown) {
      showAlert({ tone: "error", title: "No se pudo rechazar", description: errorMessage(error) });
      if (isStaleDecision(error)) {
        setRejecting(false);
        onStale?.();
      }
    } finally {
      setBusy(false);
    }
  };

  return {
    status,
    decidedAt,
    result,
    plans,
    canApprove,
    readOnlyMessage,
    busy,
    rejecting,
    setRejecting,
    reason,
    setReason,
    custom,
    setCustom,
    reasonValid,
    onApprove,
    onReject,
  };
}

export type ActionDetailState = ReturnType<typeof useActionDetail>;

/** Tipo de acción + vencimiento (o estado) y el titular violeta, bajo el título del panel. */
export function ActionDetailHeader({ proposal, state }: { proposal: CommercialProposalDTO; state: ActionDetailState }) {
  const { primary, basis } = proposalHeadline(proposal);
  const type = state.plans[0]?.type;
  const expiry = state.status === "pending" ? expiryPhrase(proposal.expires_at) : null;
  return (
    // Sin borde propio: la cabecera del panel ya trae el suyo encima (C11).
    <div className="flex flex-col gap-2 px-4 pt-3.5">
      {/* Qué es (canvas 4): «Acción recomendada · Lote de seguimiento» y, a la derecha, su estado o su vencimiento. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Acción recomendada{type !== undefined ? ` · ${OUTREACH_TYPE_LABELS[type]}` : ""}
        </p>
        {state.status !== "pending" ? (
          <StatePill tone={state.status === "approved" ? "success" : "neutral"}>{PROPOSAL_BADGES[state.status]?.label ?? state.status}</StatePill>
        ) : expiry !== null ? (
          <StatePill tone="warning">{expiry}</StatePill>
        ) : null}
      </div>
      {primary !== null ? <Headline primary={primary} /> : null}
      {basis !== null ? (
        <p className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-muted-foreground tabular-nums">
          <span>La cuenta: {basis}</span>
          {proposal.estimate_source !== null ? (
            <>
              <span aria-hidden>·</span>
              <SourceMark source={proposal.estimate_source} />
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

/** «+2 ventas estimadas · cubre el 13 %…» → la cifra grande (coral, texto grande: pasa AA) y el resto al lado. */
function Headline({ primary }: { primary: string }) {
  const at = primary.indexOf(" · ");
  const big = at === -1 ? primary : primary.slice(0, at);
  const rest = at === -1 ? null : primary.slice(at + 3);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
      <span className="font-heading text-[28px] leading-none font-extrabold tracking-[-0.02em] whitespace-nowrap text-brand tabular-nums">{big}</span>
      {rest !== null ? <span className="text-[13.5px] text-muted-foreground tabular-nums">{rest}</span> : null}
    </p>
  );
}

export function ActionDetailBody({ proposal, state }: { proposal: CommercialProposalDTO; state: ActionDetailState }) {
  return (
    <div className="flex flex-col gap-4">
      {state.result !== null ? <ApprovalOutcome result={state.result} plans={state.plans} /> : null}
      {state.status === "approved" && state.result === null ? (
        <Notice tone="ok" title={`${approvedOnPhrase(state.decidedAt)}.`} detail={approvedElsewhereDetail(state.plans)} />
      ) : null}
      {state.status === "rejected" && state.result === null ? (
        <Notice tone="neutral" title={REJECTED_MESSAGE} detail={proposal.reject_reason} />
      ) : null}

      <SheetList title="Por qué ahora">
        <li className="grouped-row px-4 py-2.5 text-[13.5px] leading-relaxed text-foreground">{proposal.rationale}</li>
        {proposal.evidence.map((item, index) => (
          <SheetRow key={`${item.label}-${String(index)}`} label={item.label} value={item.value} secondary={<EvidenceSource source={item.source} />} />
        ))}
      </SheetList>

      {state.plans.map((plan, index) => (
        <OutreachList key={`${plan.type}-${String(index)}`} plan={plan} approved={state.status === "approved"} />
      ))}

      {proposal.risks.length > 0 ? (
        <SheetList title="Qué puede salir mal">
          {proposal.risks.map((risk) => (
            <li key={risk} className="grouped-row flex gap-2 px-4 py-2.5 text-[13px] text-muted-foreground">
              <TriangleAlert aria-hidden className="mt-0.5 size-3.5 flex-none text-warning" />
              {risk}
            </li>
          ))}
        </SheetList>
      ) : null}

      {state.status === "pending" || state.status === "approved" ? (
        <SheetList title="Después">
          <li className="grouped-row flex gap-2 px-4 py-2.5 text-[13px] text-muted-foreground">
            <Info aria-hidden className="mt-0.5 size-3.5 flex-none" />
            {state.status === "pending" ? AFTER_APPROVAL_NOTE : AFTER_APPROVED_NOTE}
          </li>
        </SheetList>
      ) : null}
    </div>
  );
}

export function ActionDetailFooter({ state }: { state: ActionDetailState }) {
  const groupId = useId();
  if (state.status === "approved") {
    const destination = OUTREACH_DESTINATIONS[state.plans[0]?.type ?? "agent_task_bulk_spec"];
    return (
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href={destination.href}>
            {destination.label}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }
  if (state.status !== "pending") return null;
  if (!state.canApprove) {
    return state.readOnlyMessage === null ? null : <p className="text-[12.5px] text-muted-foreground">{state.readOnlyMessage}</p>;
  }
  if (state.rejecting) {
    return (
      <div className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-2" aria-describedby={`${groupId}-note`}>
          <legend className="mb-1 text-[13px] font-semibold">¿Por qué no?</legend>
          {REJECT_REASONS.map((option) => (
            <label key={option} className="flex items-start gap-2.5 text-[13px]">
              <input
                type="radio"
                name={`${groupId}-reason`}
                checked={state.reason === option}
                onChange={() => {
                  state.setReason(option);
                }}
                className="mt-0.5 accent-brand"
              />
              {option.replace(/\.$/, "")}
            </label>
          ))}
          <label className="flex items-start gap-2.5 text-[13px]">
            <input
              type="radio"
              name={`${groupId}-reason`}
              checked={state.reason === OTHER}
              onChange={() => {
                state.setReason(OTHER);
              }}
              className="mt-0.5 accent-brand"
            />
            <span className="min-w-0 flex-1">
              Otro motivo…
              {state.reason === OTHER ? (
                <input
                  value={state.custom}
                  onChange={(event) => {
                    state.setCustom(event.target.value);
                  }}
                  maxLength={300}
                  autoFocus
                  aria-label="Motivo propio del rechazo"
                  placeholder="Escríbelo como una regla: es lo que Axi va a recordar."
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : null}
            </span>
          </label>
        </fieldset>
        <p id={`${groupId}-note`} className="text-[12px] text-muted-foreground">
          {REJECT_NOTE}
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={state.busy}
            onClick={() => {
              state.setRejecting(false);
            }}
          >
            Volver
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={state.busy || !state.reasonValid}
            onClick={() => {
              void state.onReject();
            }}
          >
            Rechazar
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="min-w-0 flex-1 text-[12px] text-muted-foreground">{REJECT_NOTE}</p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={state.busy}
          onClick={() => {
            state.setRejecting(true);
          }}
        >
          Rechazar
        </Button>
        <Button
          size="sm"
          disabled={state.busy}
          onClick={() => {
            void state.onApprove();
          }}
        >
          <Check aria-hidden className="size-4" />
          Aprobar
        </Button>
      </div>
    </div>
  );
}

function EvidenceSource({ source }: { source: string }) {
  if (SOURCES.includes(source)) return <SourceMark source={source as SourceKind} />;
  if (source === "plan") return <span>según tu ruta</span>;
  return null;
}

/**
 * Lo que dice una aprobada sin resultado en esta sesión: dónde seguirla, en
 * presente. El servidor no persiste qué quedó; no se promete nada en futuro.
 */
function approvedElsewhereDetail(plans: readonly OutreachPlan[]): string {
  const type = plans[0]?.type;
  return type === "sequence_enrollment_spec" ? "Los contactos inscritos se siguen en Secuencias." : "Lo que se encendió se sigue en Tareas.";
}

/**
 * «Qué va a pasar» con un lote o una secuencia: a quién, por dónde, cuándo y
 * quién lo hace. Ya aprobada es «Lo que se aprobó», con el arranque en fecha
 * (no «mañana») y el enlace a donde vive lo que encendió.
 */
function OutreachList({ plan, approved }: { plan: OutreachPlan; approved: boolean }) {
  const contacts = plan.contacts === 1 ? "1 contacto" : `${formatInteger(plan.contacts)} contactos`;
  const perHour = plan.perHour !== null ? ` · ${formatInteger(plan.perHour)} por hora` : "";
  const when = plan.startsAt === null ? null : `${approved ? startDatePhrase(plan.startsAt) : startPhrase(plan.startsAt)}${perHour}`;
  const destination = OUTREACH_DESTINATIONS[plan.type];
  return (
    <SheetList title={approved ? "Lo que se aprobó" : "Qué va a pasar"}>
      <SheetRow
        label="Contactos"
        value={contacts}
        secondary={
          approved
            ? "Los que pidieron no recibir mensajes quedaron fuera al aprobar."
            : "Los que pidieron no recibir mensajes quedan fuera al aprobar."
        }
        action={
          approved ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={destination.href}>{destination.label}</Link>
            </Button>
          ) : undefined
        }
      />
      {plan.channel !== null ? <SheetRow label="Canal" value={OUTREACH_CHANNEL_LABELS[plan.channel]} /> : null}
      {when !== null ? (
        <SheetRow label={approved ? "Arranque" : "Cuándo"} value={when} secondary="Dentro de tu horario · respeta las horas de silencio." />
      ) : null}
      <SheetRow
        label="Quién"
        value={plan.agentId === null ? "Tu agente de IA activo" : "El agente de IA asignado"}
        secondary={plan.objective === null ? undefined : `Objetivo: ${plan.objective}`}
      />
    </SheetList>
  );
}

function ApprovalOutcome({ result, plans }: { result: CommercialApprovalResultDTO; plans: readonly OutreachPlan[] }) {
  const lines = approvalLines(result, plans);
  if (lines.length === 0) return <Notice tone="neutral" title="No había nada que encender en esta propuesta." />;
  return (
    <div className="flex flex-col gap-2" role="status">
      {lines.map((line, index) => (
        <Notice key={`${line.title}-${String(index)}`} tone={line.tone} title={line.title} detail={line.detail} />
      ))}
      {approvalTookEffect(result) ? null : <p className="text-[12.5px] text-muted-foreground">{NOTHING_APPLIED_NOTE}</p>}
    </div>
  );
}

function Notice({ tone, title, detail = null }: { tone: "ok" | "warn" | "neutral"; title: string; detail?: string | null }) {
  // El color vive en el punto (§10: el texto y los bordes tintados no pasan AA en claro).
  return (
    <div data-tone={tone} className="flex gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-[13px]">
      <span
        aria-hidden
        className={cn("mt-[6px] size-2 shrink-0 rounded-full", tone === "ok" ? "bg-success" : tone === "warn" ? "bg-warning" : "bg-muted-foreground")}
      />
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        {detail !== null ? <p className="mt-0.5 text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}
