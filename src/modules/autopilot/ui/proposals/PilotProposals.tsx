"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Radar } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { expiryLabel } from "@/modules/cmo/domain/proposal-labels";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Textarea } from "@/shared/components/ui/textarea";

import {
  changeRows,
  proposalRoutineId,
  rejectReason,
  type PilotProposalDTO,
} from "../../domain/proposals";
import {
  approvePilotProposal,
  listPilotProposals,
  rejectPilotProposal,
} from "../../infrastructure/proposals-service.adapter";

/** Cuántas cifras de evidencia caben sin volverse una tabla (mismo tope que la tarjeta de Axel). */
const MAX_EVIDENCE = 3;

type CardState =
  | { mode: "idle" }
  | { mode: "rejecting" }
  | { mode: "busy" }
  | { mode: "applied" }
  | { mode: "failed"; reason: string };

/**
 * «Axi propone» (P6b, mockup aprobado): encima de los pilotos, solo si hay
 * algo que decidir (el servidor tiene tope de dos). Cada tarjeta dice la cifra,
 * el porqué con sus números, qué cambia si se aplica y el riesgo. Aplicar pasa
 * por el servidor todo o nada: si el piloto cambió entretanto, gana el cambio
 * del dueño y la tarjeta lo dice.
 */
export function PilotProposals({
  routineNames,
  canManage,
}: {
  routineNames: ReadonlyMap<string, string>;
  canManage: boolean;
}) {
  const [proposals, setProposals] = useState<PilotProposalDTO[]>([]);
  const [states, setStates] = useState<Record<string, CardState>>({});

  const load = useCallback(() => {
    listPilotProposals()
      .then((result) => setProposals(result.data))
      // Sin bandeja (servidor sin P6b, sin permiso) no hay nada que mostrar.
      .catch(() => setProposals([]));
  }, []);
  useEffect(() => load(), [load]);

  const { socket } = useSocket("inbox");
  useSocketEvent(socket, "cmo.proposal_created", () => load());

  const setState = (id: string, state: CardState) => setStates((prev) => ({ ...prev, [id]: state }));

  if (proposals.length === 0) return null;

  return (
    <section aria-labelledby="pilot-proposals-title" className="@container flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pilot-proposals-title" className="font-heading text-lg font-bold">
          Axi propone
        </h2>
        <span className="text-muted-foreground text-xs">Con los números de tus rutas, sin inventar nada</span>
      </div>
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            routineNames={routineNames}
            canManage={canManage}
            state={states[proposal.id] ?? { mode: "idle" }}
            onState={(state) => setState(proposal.id, state)}
            onDismissed={() => setProposals((prev) => prev.filter((item) => item.id !== proposal.id))}
          />
        ))}
      </div>
    </section>
  );
}

function ProposalCard({
  proposal,
  routineNames,
  canManage,
  state,
  onState,
  onDismissed,
}: {
  proposal: PilotProposalDTO;
  routineNames: ReadonlyMap<string, string>;
  canManage: boolean;
  state: CardState;
  onState: (state: CardState) => void;
  onDismissed: () => void;
}) {
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [remember, setRemember] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const rows = useMemo(() => changeRows(proposal, routineNames), [proposal, routineNames]);
  const routineId = proposalRoutineId(proposal);
  const routineHref = routineId === null ? "/marketing/autopilot" : `/marketing/autopilot/${encodeURIComponent(routineId)}`;
  const applied = state.mode === "applied";
  const expiry = expiryLabel(proposal.expires_at);

  async function approve() {
    onState({ mode: "busy" });
    try {
      const result = await approvePilotProposal(proposal.id);
      if (result.status === "approved") onState({ mode: "applied" });
      else onState({ mode: "failed", reason: result.failed[0]?.reason ?? "No se pudo aplicar." });
    } catch (caught) {
      onState({ mode: "failed", reason: errorMessage(caught, "No se pudo aplicar. Intenta otra vez.") });
    }
  }

  async function reject() {
    const parsed = rejectReason(reason);
    if (parsed.error !== undefined) {
      setReasonError(parsed.error);
      return;
    }
    onState({ mode: "busy" });
    try {
      await rejectPilotProposal(proposal.id, {
        ...(parsed.reason === undefined ? {} : { reason: parsed.reason }),
        ...(remember && parsed.reason !== undefined ? { save_as_directive: true } : {}),
      });
      onDismissed();
    } catch (caught) {
      onState({ mode: "rejecting" });
      setReasonError(errorMessage(caught, "No se pudo descartar. Intenta otra vez."));
    }
  }

  return (
    <article
      aria-labelledby={titleId}
      className="glass-overlay flex min-w-0 flex-col gap-3.5 rounded-3xl p-5"
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-10 flex-none items-center justify-center rounded-[13px]",
            applied ? "bg-foreground/[0.08] text-muted-foreground" : "bg-foreground text-background",
          )}
        >
          <Radar className="size-[18px]" strokeWidth={2.1} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-[10.5px] font-semibold tracking-[0.1em] uppercase">
            <span className="whitespace-nowrap">Ajuste de la ruta</span>
            {applied ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span aria-hidden="true" className="bg-success size-1.5 rounded-full" />
                Aplicada
              </span>
            ) : expiry !== null ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span aria-hidden="true" className="bg-muted-foreground/50 size-1.5 rounded-full" />
                {expiry}
              </span>
            ) : null}
          </span>
          <h3 id={titleId} className="font-heading text-lg leading-snug font-bold text-pretty">
            {proposal.title}
          </h3>
        </div>
      </div>

      {proposal.headline !== null && (
        <p
          className={cn(
            "font-heading -mt-1 text-2xl leading-tight font-bold tracking-tight tabular-nums text-pretty",
            applied && "text-muted-foreground",
          )}
        >
          {proposal.headline}
        </p>
      )}

      {applied ? (
        <>
          <div role="status" className="bg-background/85 ring-border flex items-start gap-2.5 rounded-2xl px-3.5 py-3 text-[13px] ring-1">
            <span aria-hidden="true" className="bg-success mt-[7px] size-1.5 flex-none rounded-full" />
            <p className="text-pretty">
              Quedó puesto.
              <span className="text-muted-foreground mt-0.5 block text-xs">
                Lo ves y lo cambias cuando quieras en la ficha de la ruta.
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="glass" className="h-10 px-4">
              <Link href={routineHref}>Ver la ruta</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-[13px] leading-relaxed text-pretty">{proposal.rationale}</p>

          {proposal.evidence.length > 0 && (
            <dl
              className={cn(
                "bg-background/85 ring-border grid divide-x divide-border rounded-2xl ring-1",
                proposal.evidence.length === 1 ? "grid-cols-1" : proposal.evidence.length === 2 ? "grid-cols-2" : "grid-cols-3",
              )}
            >
              {proposal.evidence.slice(0, MAX_EVIDENCE).map((item) => (
                <div key={`${item.label}-${item.value}`} className="flex min-w-0 flex-col-reverse px-3.5 py-2.5">
                  <dt className="text-muted-foreground text-[11.5px] leading-snug break-words">{item.label}</dt>
                  <dd className="text-[14.5px] font-semibold break-words tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {rows.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-[11px]">Qué cambia si lo aplicas</span>
              <ul aria-label="Qué cambia" className="flex flex-col gap-1.5">
                {rows.map((row) => (
                  <li key={row.label} className="grid grid-cols-1 gap-x-2.5 text-[12.5px] sm:grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)]">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="break-words tabular-nums">
                      <s className="text-muted-foreground decoration-1">{row.before}</s>
                      <span aria-label="pasa a"> → </span>
                      <b className="font-semibold">{row.after}</b>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {proposal.risks.length > 0 && (
            <p className="text-muted-foreground flex gap-2 text-xs text-pretty">
              <span aria-hidden="true" className="bg-warning mt-1.5 size-1.5 flex-none rounded-full" />
              <span>{proposal.risks[0]}</span>
            </p>
          )}

          {state.mode === "failed" && (
            <div role="alert" className="bg-background/85 ring-border flex items-start gap-2.5 rounded-2xl px-3.5 py-3 text-[13px] ring-1">
              <span aria-hidden="true" className="bg-warning mt-[7px] size-1.5 flex-none rounded-full" />
              <p className="text-pretty">
                No se aplicó: {state.reason.replace(/\.$/, "")}.
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  La propuesta sigue aquí. Revisa la ruta o descártala.
                </span>
              </p>
            </div>
          )}

          {canManage && state.mode === "rejecting" ? (
            <div className="bg-background/85 ring-border flex flex-col gap-2 rounded-2xl p-3 ring-1">
              <label htmlFor={reasonId} className="text-muted-foreground text-xs">
                ¿Por qué no? (opcional)
              </label>
              <Textarea
                id={reasonId}
                value={reason}
                maxLength={300}
                aria-invalid={reasonError !== null}
                aria-describedby={reasonError === null ? undefined : `${reasonId}-error`}
                placeholder="Ej.: a esa hora mi equipo no alcanza a atender las respuestas"
                onChange={(event) => {
                  setReason(event.target.value);
                  setReasonError(null);
                }}
              />
              {reasonError !== null && (
                <p id={`${reasonId}-error`} className="text-destructive text-xs">
                  {reasonError}
                </p>
              )}
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={remember}
                  disabled={reason.trim() === ""}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Que Axi no vuelva a proponer esto
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant="contrast" className="h-10 rounded-full px-[18px]" onClick={() => void reject()}>
                  Descartar
                </Button>
                <Button variant="glass" className="h-10 px-4" onClick={() => onState({ mode: "idle" })}>
                  Volver
                </Button>
              </div>
            </div>
          ) : canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              {state.mode === "failed" ? (
                <Button asChild variant="contrast" className="h-10 rounded-full px-[18px]">
                  <Link href={routineHref}>Ver la ruta</Link>
                </Button>
              ) : (
                <Button
                  variant="contrast"
                  className="h-10 rounded-full px-[18px]"
                  disabled={state.mode === "busy"}
                  aria-busy={state.mode === "busy"}
                  onClick={() => void approve()}
                >
                  {state.mode === "busy" ? "Aplicando…" : "Aplicar ajuste"}
                </Button>
              )}
              <Button
                variant="glass"
                className="h-10 px-4"
                disabled={state.mode === "busy"}
                onClick={() => onState({ mode: "rejecting" })}
              >
                Ahora no
              </Button>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
