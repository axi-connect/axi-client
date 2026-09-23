"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight, Check, CircleCheck, Info, TriangleAlert } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatInteger } from "@/core/lib/commercial-units";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import type { CommercialApprovalResultDTO, CommercialProposalDTO, SourceKind } from "@/modules/commercial/domain/commercial";
import {
  AFTER_APPROVAL_NOTE,
  NO_APPROVE_PERMISSION_MESSAGE,
  REJECTED_MESSAGE,
  REJECT_NOTE,
} from "@/modules/commercial/domain/copy";
import {
  approvalLines,
  expiryPhrase,
  MIN_REJECT_REASON,
  OUTREACH_CHANNEL_LABELS,
  OUTREACH_TYPE_LABELS,
  proposalHeadline,
  readOutreach,
  REJECT_REASONS,
  startPhrase,
  type OutreachPlan,
} from "@/modules/commercial/domain/proposals";
import { useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Button } from "@/shared/components/ui/button";
import { PROPOSAL_BADGES } from "./ActionRow";
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
 * Sin `commercial:approve` es de solo lectura, con la línea de a quién
 * pedírselo. Devuelve cuerpo y pie por separado para que la ruta los monte en
 * UN solo `DetailSheet` (cuerpo con scroll, pie fijo).
 */
export function useActionDetail(proposalId: string, proposal: CommercialProposalDTO | null) {
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const approve = useCommercialStore((state) => state.approveProposal);
  const reject = useCommercialStore((state) => state.rejectProposal);
  const result = useCommercialStore((state) => state.approvals[proposalId] ?? null);
  const decision = useCommercialStore((state) => state.decisions[proposalId] ?? null);

  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<string>(REJECT_REASONS[0]);
  const [custom, setCustom] = useState("");

  const status = decision?.status ?? proposal?.status ?? "pending";
  const canApprove = hasPermission("commercial:approve");
  const plans = proposal === null ? [] : readOutreach(proposal.artifacts, proposal.created_at);
  const effectiveReason = reason === OTHER ? custom.trim() : reason;
  const reasonValid = reason !== OTHER || effectiveReason.length >= MIN_REJECT_REASON;

  const onApprove = async () => {
    setBusy(true);
    try {
      await approve(proposalId);
    } catch (error: unknown) {
      showAlert({ tone: "error", title: errorMessage(error) });
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
      showAlert({ tone: "error", title: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return {
    status,
    result,
    plans,
    canApprove,
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
    <div className="flex flex-col gap-1.5 border-b border-border px-4 pb-3.5">
      <p className="flex flex-wrap items-center gap-2">
        {type !== undefined ? (
          <StatusBadge status={type} map={{ [type]: { label: OUTREACH_TYPE_LABELS[type], tone: "neutral" } }} appearance="dot" />
        ) : null}
        {state.status !== "pending" ? (
          <StatusBadge status={state.status} map={PROPOSAL_BADGES} appearance="dot" />
        ) : expiry !== null ? (
          <StatusBadge status="expiry" map={{ expiry: { label: expiry, tone: "warning" } }} appearance="dot" />
        ) : null}
      </p>
      {primary !== null ? <p className="text-[15px] font-medium text-accent-violet tabular-nums">{primary}</p> : null}
      {basis !== null ? <p className="text-[12.5px] text-muted-foreground tabular-nums">La cuenta: {basis}</p> : null}
    </div>
  );
}

export function ActionDetailBody({ proposal, state }: { proposal: CommercialProposalDTO; state: ActionDetailState }) {
  return (
    <div className="flex flex-col gap-4">
      {state.result !== null ? <ApprovalOutcome result={state.result} plans={state.plans} /> : null}
      {state.status === "rejected" && state.result === null ? (
        <Notice tone="neutral" title={REJECTED_MESSAGE} detail={proposal.reject_reason} />
      ) : null}

      <SheetList title="Por qué ahora">
        <li className="grouped-row px-4 py-2.5 text-[13.5px] leading-relaxed text-foreground">{proposal.rationale}</li>
        {proposal.evidence.map((item, index) => (
          <SheetRow key={`${item.label}-${String(index)}`} label={item.label} value={String(item.value)} secondary={<EvidenceSource source={item.source} />} />
        ))}
      </SheetList>

      {state.plans.map((plan, index) => (
        <OutreachList key={`${plan.type}-${String(index)}`} plan={plan} />
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

      <SheetList title="Después">
        <li className="grouped-row flex gap-2 px-4 py-2.5 text-[13px] text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-3.5 flex-none" />
          {AFTER_APPROVAL_NOTE}
        </li>
      </SheetList>
    </div>
  );
}

export function ActionDetailFooter({ state }: { state: ActionDetailState }) {
  const groupId = useId();
  if (state.status === "approved") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/crm/tasks">
            Ver en Tareas
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }
  if (state.status !== "pending") return null;
  if (!state.canApprove) {
    return <p className="text-[12.5px] text-muted-foreground">{NO_APPROVE_PERMISSION_MESSAGE}</p>;
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

/** «Qué va a pasar» con un lote o una secuencia: a quién, por dónde, cuándo y quién lo hace. */
function OutreachList({ plan }: { plan: OutreachPlan }) {
  const contacts = plan.contacts === 1 ? "1 contacto" : `${formatInteger(plan.contacts)} contactos`;
  const when =
    plan.startsAt !== null
      ? `${startPhrase(plan.startsAt)}${plan.perHour !== null ? ` · ${formatInteger(plan.perHour)} por hora` : ""}`
      : null;
  return (
    <SheetList title="Qué va a pasar">
      <SheetRow label="Contactos" value={contacts} secondary="Los que pidieron no recibir mensajes quedan fuera al aprobar." />
      {plan.channel !== null ? <SheetRow label="Canal" value={OUTREACH_CHANNEL_LABELS[plan.channel]} /> : null}
      {when !== null ? <SheetRow label="Cuándo" value={when} secondary="Dentro de tu horario · respeta las horas de silencio." /> : null}
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
    </div>
  );
}

function Notice({ tone, title, detail = null }: { tone: "ok" | "warn" | "neutral"; title: string; detail?: string | null }) {
  const Icon = tone === "ok" ? CircleCheck : tone === "warn" ? TriangleAlert : Info;
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-xl border p-3 text-[13px]",
        tone === "ok" ? "border-success/40" : tone === "warn" ? "border-warning/40" : "border-border",
      )}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-4 flex-none", tone === "ok" ? "text-success" : tone === "warn" ? "text-warning" : "text-muted-foreground")} />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        {detail !== null ? <p className="mt-0.5 text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}
