"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, RotateCcw, Target } from "lucide-react";

import { formatInteger } from "@/core/lib/commercial-units";
import { cn } from "@/core/lib/utils";
import type { CommercialProposalDTO, PaceStatus } from "@/modules/commercial/domain/commercial";
import { LEARNING_PROPOSALS_MESSAGE, noProposalsMessage } from "@/modules/commercial/domain/copy";
import { commercialProposalHref, decidedOnShort, expiryPhrase, proposalHeadline } from "@/modules/commercial/domain/proposals";
import { InkIsland } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

export interface RecommendedActionsProps {
  /** `undefined` = cargando (primera vez). Una lista vacía de verdad dice lo que toca según el ritmo. */
  proposals?: readonly CommercialProposalDTO[];
  error?: string | null;
  onRetry?: () => void;
  learning?: boolean;
  /** El ritmo de la ruta: con ritmo bajo el vacío no dice «Estás al día» (Q12). */
  paceStatus?: PaceStatus | null;
  canApprove?: boolean;
  /** Sin poder aprobar: a quién pedírselo (permiso o plan sin `crm_ai`). `null` = no se dice nada aún. */
  readOnlyMessage?: string | null;
  onApprove?: (id: string) => Promise<void>;
  /** Ids con el resultado de su aprobación en esta sesión (C6). */
  resultIds?: ReadonlySet<string>;
  className?: string;
}

/**
 * «Acciones recomendadas»: lo que Axi prepara para acelerar la ruta y el dueño
 * aprueba (D4). Es LA isla de la pantalla (§9.5), en el material por defecto,
 * con su brillo de marca: un solo color, nada de degradados «de IA».
 *
 * Anatomía (canvas 1): la pendiente que más acerca, abierta, con su cuenta y
 * sus dos botones; el resto de pendientes en filas; debajo, las decididas del
 * mes (aprobadas con «Ver qué quedó» si esta sesión tiene el resultado, C6;
 * descartadas con su motivo, que es lo que Axi recuerda).
 *
 * Sin permiso de aprobar (o sin la capacidad `crm_ai`) todo enlaza al detalle
 * de solo lectura y una línea dice a quién pedírselo.
 */
export function RecommendedActions({
  proposals,
  error = null,
  onRetry,
  learning = false,
  paceStatus = null,
  canApprove = false,
  readOnlyMessage = null,
  onApprove,
  resultIds,
  className,
}: RecommendedActionsProps) {
  const pending = proposals?.filter((proposal) => proposal.status === "pending") ?? [];
  const decided = proposals?.filter((proposal) => proposal.status !== "pending") ?? [];
  const [lead, ...rest] = pending;
  const approve = canApprove ? onApprove : undefined;

  return (
    <InkIsland label="Acciones recomendadas" className={cn("gap-4 p-5 @xl:p-6", className)}>
      {/* El contador baja de línea antes que partir el título. */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-muted ring-1 ring-border ring-inset">
            <Target className="size-[18px]" strokeWidth={1.8} />
          </span>
          <div className="flex min-w-0 flex-col">
            <h2 className="font-heading text-lg leading-tight font-bold tracking-[-0.01em] whitespace-nowrap">Acciones recomendadas</h2>
            <p className="truncate text-xs text-muted-foreground">Las prepara Axi · tú decides</p>
          </div>
        </div>
        {pending.length > 0 ? (
          <span className="ml-auto shrink-0 text-xs whitespace-nowrap text-muted-foreground">{formatInteger(pending.length)} por decidir</span>
        ) : null}
      </header>

      {proposals === undefined ? (
        error !== null ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            {onRetry !== undefined ? (
              <Button variant="glass" size="sm" onClick={onRetry}>
                <RotateCcw aria-hidden className="size-4" />
                Reintentar
              </Button>
            ) : null}
          </div>
        ) : (
          <div role="status" aria-label="Cargando las acciones recomendadas" className="space-y-2.5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )
      ) : (
        <>
          {lead === undefined ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{learning ? LEARNING_PROPOSALS_MESSAGE : noProposalsMessage(paceStatus)}</p>
          ) : (
            <LeadAction proposal={lead} onApprove={approve} />
          )}

          {rest.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border border-t border-border">
              {rest.map((proposal) => (
                <PendingRow key={proposal.id} proposal={proposal} onApprove={approve} />
              ))}
            </ul>
          ) : null}

          {!canApprove && pending.length > 0 && readOnlyMessage !== null ? (
            <p className="text-[12.5px] text-muted-foreground">{readOnlyMessage}</p>
          ) : null}

          {decided.length > 0 ? (
            <section aria-labelledby="actions-decided" className="flex flex-col border-t border-border">
              <h3 id="actions-decided" className="px-1 pt-3.5 pb-1 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Decididas este mes
              </h3>
              <ul className="flex flex-col divide-y divide-border">
                {decided.map((proposal) => (
                  <DecidedRow key={proposal.id} proposal={proposal} hasResult={resultIds?.has(proposal.id) ?? false} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <p className="mt-auto text-xs leading-relaxed text-muted-foreground">Nada se envía sin tu aprobación.</p>
    </InkIsland>
  );
}

/** «+2 ventas estimadas · cubre el 20 %…» → la cifra grande y el resto al lado. */
function splitHeadline(primary: string): [string, string | null] {
  const at = primary.indexOf(" · ");
  return at === -1 ? [primary, null] : [primary.slice(0, at), primary.slice(at + 3)];
}

function useApprove(proposalId: string, onApprove?: (id: string) => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (onApprove === undefined) return;
    setBusy(true);
    try {
      await onApprove(proposalId);
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

function Expiry({ proposal }: { proposal: CommercialProposalDTO }) {
  const expiry = expiryPhrase(proposal.expires_at);
  if (expiry === null) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] whitespace-nowrap text-muted-foreground">
      <span aria-hidden className="size-1.5 rounded-full bg-warning" />
      {expiry}
    </span>
  );
}

/** La pendiente que más acerca, abierta: título, lo que aporta, por qué, la cuenta y los dos botones. */
function LeadAction({ proposal, onApprove }: { proposal: CommercialProposalDTO; onApprove?: (id: string) => Promise<void> }) {
  const href = commercialProposalHref(proposal.id);
  const { primary, basis } = proposalHeadline(proposal);
  const [big, small] = primary === null ? [null, null] : splitHeadline(primary);
  const { busy, run } = useApprove(proposal.id, onApprove);

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-[22px] bg-foreground/[0.04] p-4 ring-1 ring-border ring-inset @xl:p-5">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">La que más te acerca</p>
      <h3 className="font-heading text-xl leading-tight font-bold tracking-[-0.015em] text-pretty">
        <Link href={href} className="rounded-sm py-0.5 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          {proposal.title}
        </Link>
      </h3>
      {big !== null ? (
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {/* 26 px en negrita: el coral pasa AA como texto grande. */}
          <span className="font-heading text-[26px] leading-none font-extrabold tracking-[-0.02em] whitespace-nowrap text-brand tabular-nums">{big}</span>
          {small !== null ? <span className="text-[13px] text-muted-foreground">{small}</span> : null}
        </p>
      ) : null}
      <p className="text-[13.5px] leading-relaxed text-pretty text-foreground/80">{proposal.rationale}</p>
      {basis !== null ? (
        <p className="rounded-xl bg-foreground/[0.05] px-3 py-2.5 font-mono text-[11.5px] break-words text-muted-foreground tabular-nums">{basis}</p>
      ) : null}
      <Expiry proposal={proposal} />
      <div className={cn("grid gap-2", onApprove !== undefined && "grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]")}>
        <Button asChild variant="glass" className="h-11">
          <Link href={href}>Ver el detalle</Link>
        </Button>
        {onApprove !== undefined ? (
          <Button variant="contrast" className="h-11 rounded-full" disabled={busy} aria-label={`Aprobar: ${proposal.title}`} onClick={() => void run()}>
            <Check aria-hidden className="size-4" />
            Aprobar
          </Button>
        ) : null}
      </div>
    </article>
  );
}

/** Otra pendiente, en una fila: título, lo que aporta, vencimiento y «Aprobar». */
function PendingRow({ proposal, onApprove }: { proposal: CommercialProposalDTO; onApprove?: (id: string) => Promise<void> }) {
  const { primary } = proposalHeadline(proposal);
  const { busy, run } = useApprove(proposal.id, onApprove);
  return (
    <li className="flex min-w-0 flex-col gap-1.5 px-1 py-3">
      <Link href={commercialProposalHref(proposal.id)} className="rounded-sm py-0.5 text-[14.5px] font-medium text-pretty hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {proposal.title}
      </Link>
      {primary !== null ? <span className="text-[12.5px] text-foreground/80 tabular-nums">{primary}</span> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Expiry proposal={proposal} />
        {onApprove !== undefined ? (
          <Button size="sm" variant="contrast" className="ml-auto rounded-full" disabled={busy} aria-label={`Aprobar: ${proposal.title}`} onClick={() => void run()}>
            <Check aria-hidden className="size-4" />
            Aprobar
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/** Una decidida del mes: cuándo y cómo se decidió, el título y, si se descartó, su motivo. */
function DecidedRow({ proposal, hasResult }: { proposal: CommercialProposalDTO; hasResult: boolean }) {
  const approved = proposal.status === "approved";
  return (
    <li>
      <Link
        href={commercialProposalHref(proposal.id)}
        className="group flex min-w-0 flex-col gap-1 rounded-lg px-1 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className={cn("size-1.5 rounded-full", approved ? "bg-success" : "bg-muted-foreground")} />
          {decidedOnShort(proposal.status, proposal.decided_at)}
        </span>
        <span className="text-[14px] font-medium text-pretty group-hover:underline">{proposal.title}</span>
        {!approved && proposal.reject_reason !== null && proposal.reject_reason !== "" ? (
          <span className="text-[12.5px] text-muted-foreground">«{proposal.reject_reason.replace(/\.$/, "")}»</span>
        ) : null}
        <span className="inline-flex items-center gap-1 text-[12.5px] font-medium">
          {approved && hasResult ? "Ver qué quedó" : "Ver"}
          <ArrowRight aria-hidden className="size-3.5" />
        </span>
      </Link>
    </li>
  );
}
