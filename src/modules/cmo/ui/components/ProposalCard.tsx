"use client";

import Link from "next/link";
import { ArrowRight, Bot, Check, Clock, Flame, Lightbulb, Megaphone, RefreshCw, Route, Tag, Users } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { ProposalDTO, ProposalKind } from "@/modules/cmo/domain/cmo";
import { commercialProposalHref, isCommercialProposal } from "@/modules/commercial/public";
import {
  expiryLabel,
  isUrgent,
  proposalKindLabel,
  proposalStatusLabel,
} from "@/modules/cmo/domain/proposal-labels";

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

/**
 * El tono del estado, una vez decidida. Verde solo para aprobada: es la única
 * que dejó algo encendido. Descartada, vencida y reemplazada son neutras — no
 * son fallos y pintarlas de rojo diría que algo salió mal.
 */
const STATUS_TONE: Partial<Record<ProposalDTO["status"], string>> = {
  approved: "border-success/40 text-success",
};

/** El acento del chip por tipo. Semántico: ámbar urge, azul revisa, violeta IA. */
const KIND_TONE: Record<ProposalKind, string> = {
  campaign: "text-accent-violet border-accent-violet/40",
  recovery: "text-accent-amber border-accent-amber/40",
  repurchase: "text-success border-success/40",
  promotion: "text-accent-amber border-accent-amber/40",
  segment: "text-info border-info/40",
  agent_tuning: "text-info border-info/40",
  insight: "text-muted-foreground border-border",
  // Coral: habla el progreso hacia la meta, no la IA ni una alarma.
  goal_pace: "text-brand border-brand/40",
};

interface ProposalCardProps {
  proposal: ProposalDTO;
  /** Variante compacta para el rail; la ancha va dentro del hilo. */
  compact?: boolean;
  /**
   * La propuesta ACABA de nacer en este turno de la conversación.
   *
   * Enciende el anillo cometa y la entrada en relieve: es la señal de que hay
   * algo nuevo que decidir, y hace falta porque la tarjeta aterriza al final de
   * un hilo de texto donde, sin relieve, se lee como un párrafo más. El anillo
   * se apaga solo a las tres vueltas (`.axel-comet-card--new` en globals.css).
   */
  fresh?: boolean;
  /**
   * A dónde lleva «Revisar». Por defecto, el detalle de Axel; una propuesta del
   * método comercial (`source: "commercial"`) se decide en
   * `/comercial/acciones/:id`, con su «Qué va a pasar» y sus permisos
   * (`commercial:approve`), así que ahí enlaza sin que el llamador lo diga.
   */
  href?: string;
}

/**
 * La tarjeta de propuesta: la unidad de producto del módulo.
 *
 * El orden de lectura es fijo a propósito y esa rigidez es lo que construye
 * confianza — **titular, cifra, por qué ahora**. El dueño decide en tres
 * segundos si le interesa y solo entonces abre el detalle.
 *
 * El vencimiento se pinta con color de alarma solo dentro de las 48 horas. Si
 * todo urgiera, nada urgiría: es el mismo principio del tope de propuestas.
 */
export function ProposalCard({ proposal, compact = false, fresh = false, href }: ProposalCardProps) {
  const target =
    href ?? (isCommercialProposal(proposal) ? commercialProposalHref(proposal.id) : `/cmo/proposals/${proposal.id}`);
  const Icon = KIND_ICONS[proposal.kind] ?? Lightbulb;
  const expiry = expiryLabel(proposal.expires_at);
  const urgent = isUrgent(proposal.expires_at);
  /* Ya decidida: se queda en el hilo como registro de lo que Axel armó, pero
     baja de tono. Sigue pidiendo una decisión que ya se tomó sería mentir, y el
     violeta de la acción tiene que quedar libre para lo que sí falta decidir. */
  const settled = proposal.status !== "pending";

  if (compact) {
    return (
      <Link
        href={target}
        className={cn(
          "flex items-center gap-2.5 rounded-md border border-border bg-secondary/40 px-3 py-2.5",
          "transition-colors hover:border-accent-violet/30 hover:bg-accent-violet/5",
        )}
      >
        <Icon
          className={cn("size-4 flex-none", KIND_TONE[proposal.kind]?.split(" ")[0])}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{proposal.title}</span>
        {expiry !== null ? (
          <span
            className={cn(
              "flex-none rounded-full border px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap",
              urgent
                ? "border-warning/35 text-warning"
                : "border-border text-muted-foreground",
            )}
          >
            {expiry}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <article
      aria-label={proposal.title}
      className={cn(
        "axel-comet-card flex flex-col gap-3 overflow-hidden rounded-lg p-4",
        settled
          ? "border border-border bg-secondary/40"
          : "border border-accent-violet/30 bg-accent-violet/5",
        fresh && !settled && "axel-comet-card--new",
      )}
    >
      {settled ? null : (
        // Utilidad de globals.css: un color-mix anidado dentro de bg-[...] es
        // exactamente el patrón que el KB del slice prohíbe (F11).
        <div aria-hidden="true" className="axel-card-halo pointer-events-none absolute inset-0 -z-10" />
      )}
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1",
            "text-[10px] font-bold tracking-wider uppercase",
            KIND_TONE[proposal.kind] ?? "border-border text-muted-foreground",
          )}
        >
          <Icon className="size-3" aria-hidden="true" />
          {proposalKindLabel(proposal.kind)}
        </span>
        {settled ? (
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
              "text-[10.5px] font-semibold whitespace-nowrap",
              STATUS_TONE[proposal.status] ?? "border-border text-muted-foreground",
            )}
          >
            {proposal.status === "approved" ? (
              <Check className="size-3" aria-hidden="true" />
            ) : null}
            {proposalStatusLabel(proposal.status)}
          </span>
        ) : expiry !== null ? (
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 text-[10.5px] font-semibold",
              urgent ? "text-warning" : "text-muted-foreground/70",
            )}
          >
            <Clock className="size-3" aria-hidden="true" />
            {expiry}
          </span>
        ) : null}
      </div>

      <div>
        <h3 className="font-heading text-base leading-snug font-bold">{proposal.title}</h3>
        {proposal.headline !== null ? (
          <p
            className={cn(
              "font-heading mt-1 text-sm font-bold tabular-nums",
              settled ? "text-muted-foreground" : "text-accent-violet",
            )}
          >
            {proposal.headline}
          </p>
        ) : null}
      </div>

      <p className="text-[12.5px] leading-relaxed text-muted-foreground">{proposal.rationale}</p>

      <div className="flex items-center gap-2.5">
        <Link
          href={target}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold",
            settled
              ? "border border-border text-muted-foreground transition-colors hover:border-accent-violet/40 hover:text-accent-violet"
              : "bg-accent-violet text-primary-foreground transition-[filter] hover:brightness-110",
          )}
        >
          {settled ? "Ver qué quedó" : "Revisar"}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
        {/* Cuántos borradores esperan, solo mientras esperan, y la palabra que
            importa: «apagados». Es la promesa del módulo (nada se enciende sin
            aprobar) en un chip. Al aprobar, lo que quedó encendido lo dice el
            detalle: aquí sería una afirmación sin comprobar. */}
        {!settled && proposal.artifacts.length > 0 ? (
          <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10.5px] text-muted-foreground tabular-nums">
            {proposal.artifacts.length} {proposal.artifacts.length === 1 ? "borrador" : "borradores"} · apagados
          </span>
        ) : null}
      </div>
    </article>
  );
}
