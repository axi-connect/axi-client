"use client";

import Link from "next/link";
import { ArrowRight, Bot, Clock, Flame, Lightbulb, Megaphone, RefreshCw, Sparkles, Tag, Users } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { ProposalDTO, ProposalKind } from "@/modules/cmo/domain/cmo";
import {
  expiryLabel,
  isUrgent,
  proposalKindLabel,
  proposalSourceLabel,
} from "@/modules/cmo/domain/proposal-labels";

const KIND_ICONS: Record<ProposalKind, typeof Flame> = {
  campaign: Megaphone,
  recovery: Flame,
  repurchase: RefreshCw,
  promotion: Tag,
  segment: Users,
  agent_tuning: Bot,
  insight: Lightbulb,
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
};

interface ProposalCardProps {
  proposal: ProposalDTO;
  /** Variante compacta para el rail; la ancha va dentro del hilo. */
  compact?: boolean;
  /**
   * Sello de origen para la variante ancha. Solo tiene sentido dentro del hilo:
   * ahí la tarjeta convive con la conversación y hay que decir si Axel la trajo
   * por su cuenta o si la armó porque se la pidieron.
   */
  stamped?: boolean;
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
export function ProposalCard({ proposal, compact = false, stamped = false }: ProposalCardProps) {
  const Icon = KIND_ICONS[proposal.kind] ?? Lightbulb;
  const expiry = expiryLabel(proposal.expires_at);
  const urgent = isUrgent(proposal.expires_at);

  if (compact) {
    return (
      <Link
        href={`/cmo/proposals/${proposal.id}`}
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
    <article className="relative isolate flex flex-col gap-3 overflow-hidden rounded-lg border border-accent-violet/30 bg-accent-violet/5 p-4 shadow-float">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_110px_at_22px_18px,color-mix(in_srgb,var(--axi-violet)_18%,transparent),transparent)]"
      />
      {stamped ? (
        <p className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground/70">
          <Sparkles className="size-3 text-accent-violet" aria-hidden="true" />
          Axel · {proposalSourceLabel(proposal.source)}
        </p>
      ) : null}
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
        {expiry !== null ? (
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
          <p className="font-heading mt-1 text-sm font-bold text-accent-violet tabular-nums">
            {proposal.headline}
          </p>
        ) : null}
      </div>

      <p className="text-[12.5px] leading-relaxed text-muted-foreground">{proposal.rationale}</p>

      <div className="flex items-center gap-2.5">
        <Link
          href={`/cmo/proposals/${proposal.id}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md bg-accent-violet px-3 py-1.5",
            "text-xs font-semibold text-primary-foreground transition-[filter] hover:brightness-110",
          )}
        >
          Revisar
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
        {proposal.artifacts.length > 0 ? (
          <span className="text-[10.5px] text-muted-foreground/70">
            {proposal.artifacts.length}{" "}
            {proposal.artifacts.length === 1 ? "borrador listo" : "borradores listos"}, apagados
          </span>
        ) : null}
      </div>
    </article>
  );
}
