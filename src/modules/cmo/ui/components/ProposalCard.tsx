"use client";

import { memo } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Flame, Lightbulb, Megaphone, RefreshCw, Route, Tag, Users } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { ProposalDTO, ProposalKind } from "@/modules/cmo/domain/cmo";
import { commercialProposalHref, isCommercialProposal } from "@/modules/commercial/public";
import {
  expiryLabel,
  isUrgent,
  proposalKindLabel,
  proposalStatusLabel,
} from "@/modules/cmo/domain/proposal-labels";
import { Button } from "@/shared/components/ui/button";

const KIND_ICONS: Record<ProposalKind, typeof Flame> = {
  campaign: Megaphone,
  recovery: Flame,
  repurchase: RefreshCw,
  promotion: Tag,
  segment: Users,
  agent_tuning: Bot,
  insight: Lightbulb,
  goal_pace: Route,
};

/** Cuántas cifras de evidencia caben en la fila sin volverse una tabla. */
const MAX_EVIDENCE = 3;
const EVIDENCE_COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" };

interface ProposalCardProps {
  proposal: ProposalDTO;
  /** Variante compacta para el panel «Por decidir»; la ancha va dentro del hilo. */
  compact?: boolean;
  /**
   * La propuesta ACABA de nacer en este turno de la conversación.
   *
   * Enciende el anillo en tinta y la entrada: es la señal de que hay algo
   * nuevo que decidir, y hace falta porque la tarjeta aterriza al final de un
   * hilo de texto donde, sin relieve, se lee como un párrafo más. El anillo se
   * apaga solo a las tres vueltas (`.axel-comet-card--new` en globals.css).
   */
  fresh?: boolean;
  /**
   * A dónde lleva «Revisar». Por defecto, el detalle de Axel; una propuesta del
   * método comercial (`source: "commercial"`) se decide en
   * `/comercial/acciones/:id`, con su «Qué va a pasar» y sus permisos
   * (`commercial:approve`), así que ahí enlaza sin que el llamador lo diga.
   */
  href?: string;
  /**
   * «¿Por qué ahora?»: le pregunta a Axel por esta propuesta en la misma
   * conversación. Sin él (panel, detalle, Axel bloqueado) no hay botón.
   */
  onAsk?: (proposal: ProposalDTO) => void;
  /** Axel está trabajando: no se le puede preguntar otra cosa todavía. */
  askDisabled?: boolean;
}

/**
 * La tarjeta de propuesta: la unidad de producto del módulo, con el lenguaje de
 * las fichas de /comercial (decisión del dueño 2026-09-28): monocroma, el tipo
 * en un cuadro de tinta, un antetítulo pequeño, la cifra en Nexa y dos
 * botones — el fuerte en tinta y el secundario de cristal.
 *
 * El orden de lectura es fijo a propósito y esa rigidez es lo que construye
 * confianza — **titular, cifra, por qué ahora**. El dueño decide en tres
 * segundos si le interesa y solo entonces abre el detalle.
 *
 * El vencimiento lleva punto de alarma solo dentro de las 48 horas (el color
 * de un estado va en su punto, no en el texto: §3.5 AA). Si todo urgiera, nada
 * urgiría: es el mismo principio del tope de propuestas.
 *
 * `memo`: el hilo se vuelve a pintar al llegar mensajes y la tarjeta no tiene
 * por qué hacerlo con él.
 */
export const ProposalCard = memo(function ProposalCard({
  proposal,
  compact = false,
  fresh = false,
  href,
  onAsk,
  askDisabled = false,
}: ProposalCardProps) {
  const target =
    href ?? (isCommercialProposal(proposal) ? commercialProposalHref(proposal.id) : `/cmo/proposals/${proposal.id}`);
  const Icon = KIND_ICONS[proposal.kind] ?? Lightbulb;
  const expiry = expiryLabel(proposal.expires_at);
  const urgent = isUrgent(proposal.expires_at);
  /* Ya decidida: se queda en el hilo como registro de lo que Axel armó, pero
     baja de tono. Seguir pidiendo una decisión que ya se tomó sería mentir. */
  const settled = proposal.status !== "pending";

  // El separador es el propio punto del estado: un «·» suelto quedaba al
  // principio de la línea cuando el antetítulo se partía en el panel.
  const state = settled
    ? { dot: proposal.status === "approved" ? "bg-success" : "bg-muted-foreground", label: proposalStatusLabel(proposal.status) }
    : expiry !== null
      ? { dot: urgent ? "bg-warning" : "bg-muted-foreground/50", label: expiry.toLowerCase() }
      : null;
  const kicker = (
    <span className="flex flex-wrap items-center gap-x-2 text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
      <span className="whitespace-nowrap">{proposalKindLabel(proposal.kind)}</span>
      {state === null ? null : (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", state.dot)} />
          <span>{state.label}</span>
        </span>
      )}
    </span>
  );

  const tile = (size: string, iconSize: string) => (
    <span
      aria-hidden="true"
      className={cn(
        "flex flex-none items-center justify-center",
        size,
        settled ? "bg-foreground/[0.08] text-muted-foreground" : "bg-foreground text-background",
      )}
    >
      <Icon className={iconSize} strokeWidth={2.1} />
    </span>
  );

  if (compact) {
    return (
      <Link
        href={target}
        className={cn(
          "grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-2xl bg-background/85 px-3.5 py-3 ring-1 ring-border",
          "transition-shadow hover:ring-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        {tile("size-9 rounded-xl", "size-4")}
        <span className="flex min-w-0 flex-col gap-0.5">
          {kicker}
          <b className="text-[13.5px] leading-snug font-semibold text-pretty">{proposal.title}</b>
          {proposal.headline !== null ? (
            <span className="line-clamp-2 text-xs text-muted-foreground tabular-nums" title={proposal.headline}>
              {proposal.headline}
            </span>
          ) : null}
        </span>
      </Link>
    );
  }

  const evidence = proposal.evidence.slice(0, MAX_EVIDENCE);
  const drafts = proposal.artifacts.length;

  return (
    <article
      aria-label={proposal.title}
      className={cn(
        "axel-comet-card glass-overlay flex flex-col gap-4 rounded-3xl p-5",
        fresh && !settled && "axel-comet-card--new",
      )}
    >
      <div className="flex items-start gap-3.5">
        {tile("size-10 rounded-[13px]", "size-[18px]")}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {kicker}
          <h3 className="font-heading text-lg leading-snug font-bold text-pretty">{proposal.title}</h3>
        </div>
      </div>

      {proposal.headline !== null ? (
        <p
          className={cn(
            "font-heading -mt-1 text-2xl leading-tight font-bold tracking-tight tabular-nums text-pretty",
            settled && "text-muted-foreground",
          )}
        >
          {proposal.headline}
        </p>
      ) : null}

      <p className="text-[13px] leading-relaxed text-muted-foreground">{proposal.rationale}</p>

      {evidence.length > 0 ? (
        <dl className={cn("grid divide-x divide-border rounded-2xl bg-background/85 ring-1 ring-border", EVIDENCE_COLS[evidence.length])}>
          {evidence.map((item) => (
            <div key={`${item.label}-${item.value}`} className="flex min-w-0 flex-col-reverse px-3.5 py-2.5">
              <dt className="text-[11.5px] leading-snug break-words text-muted-foreground">{item.label}</dt>
              <dd className="text-[14.5px] font-semibold break-words tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant={settled ? "glass" : "contrast"} className="h-10 rounded-full px-[18px]">
          <Link href={target}>
            {settled ? "Ver qué quedó" : "Revisar y decidir"}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
        {!settled && onAsk !== undefined ? (
          <Button
            type="button"
            variant="glass"
            className="h-10 px-4"
            disabled={askDisabled}
            onClick={() => {
              onAsk(proposal);
            }}
          >
            ¿Por qué ahora?
          </Button>
        ) : null}
        {/* Cuántos borradores esperan, solo mientras esperan, y la palabra que
            importa: «apagados». Es la promesa del módulo (nada se enciende sin
            aprobar). Al aprobar, lo que quedó encendido lo dice el detalle. */}
        {!settled && drafts > 0 ? (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {drafts} {drafts === 1 ? "borrador · apagado" : "borradores · apagados"}
          </span>
        ) : null}
      </div>
    </article>
  );
});
