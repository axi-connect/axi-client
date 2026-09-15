"use client";

import { Clock, Inbox, RotateCcw } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { BriefingDTO } from "@/modules/cmo/domain/cmo";
import { formatHour, toneClasses } from "@/modules/cmo/domain/proposal-labels";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface BriefingHeroProps {
  briefing: BriefingDTO | null;
  loading: boolean;
  /** Fallo al CARGAR el briefing. Es un estado propio: pintarlo como «primer
   *  contacto» afirmaba que el tenant no tenía informe cuando lo que pasó fue
   *  un error de red (F1 de la auditoría). */
  error: string | null;
  onRetry: () => void;
  /** Hora local a la que corre el briefing, de los ajustes del tenant. */
  briefingHour: number;
  ownerName: string | null;
  /** Propuestas pendientes: es lo que el hero promete que hay más abajo. */
  proposalCount: number;
}

/** Cuántas cifras del informe caben bajo el titular sin volverse una tabla. */
const MAX_HIGHLIGHTS = 3;

/**
 * El texto del hero, debajo de la barra de Axel: saludo, titular y chips.
 *
 * Es solo copy: el avatar y la fecha viven en `AxelDock`, que es sticky y se
 * acopla al bajar. Aquí no queda nada que explique al personaje: «Miro tus
 * números y te dejo propuestas» aparece solo en el primer contacto, y la
 * promesa de confianza vive una vez, bajo el compositor.
 *
 * **El titular es el `summary` tal cual.** El contrato solo trae esa frase; lo
 * que llega del backend se pinta, y punto. Las cifras (`highlights`) viajan con
 * él como chips: antes estaban en el rail, lejos de la frase que explican.
 *
 * El caso que decide la forma NO es el feliz: es el del tenant que acaba de
 * encender a Axel y aún no tiene informe. Es un estado **normal**, así que dice
 * cuándo llega en un chip, no en una tarjeta que compita con el chat.
 */
export function BriefingHero({
  briefing,
  loading,
  error,
  onRetry,
  briefingHour,
  ownerName,
  proposalCount,
}: BriefingHeroProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-[13px] text-muted-foreground">{ownerName === null ? "Hola" : `Hola, ${ownerName}`}</p>

      {error !== null && briefing === null ? (
        <>
          <p className="mt-3 text-[13px] text-muted-foreground">No pude cargar el informe.</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-[11.5px] font-semibold text-foreground backdrop-blur transition-colors hover:border-accent-violet/40"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Reintentar
          </button>
        </>
      ) : loading && briefing === null ? (
        <div className="mt-3 flex w-full max-w-[26ch] flex-col items-center gap-3">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-4/5" />
        </div>
      ) : briefing === null ? (
        <>
          <h1 className="font-heading mt-1 max-w-[24ch] text-[30px] leading-[1.2] font-extralight tracking-tight text-balance text-foreground/30">
            Soy Axel, tu <b className="font-bold text-foreground">director de mercadeo</b>
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">Miro tus números y te dejo propuestas.</p>
          <Chip className="mt-3">
            <Clock className="size-3.5 text-accent-violet" aria-hidden="true" />
            <span>
              Primer informe mañana · <b className="font-semibold text-foreground">{formatHour(briefingHour)}</b>
            </span>
          </Chip>
        </>
      ) : (
        <>
          <h1
            className={cn(
              "font-heading mt-1 max-w-[26ch] text-[26px] leading-[1.25] font-bold",
              "tracking-tight text-balance tabular-nums",
              loading && "opacity-60 transition-opacity",
            )}
          >
            {briefing.summary}
          </h1>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {proposalCount > 0 ? (
              <Chip className="border-accent-violet/40 text-accent-violet">
                <Inbox className="size-3.5" aria-hidden="true" />
                <b className="font-semibold tabular-nums">{proposalCount}</b> por decidir
              </Chip>
            ) : (
              <Chip>Hoy no hay nada que proponer.</Chip>
            )}
            {briefing.highlights.slice(0, MAX_HIGHLIGHTS).map((highlight) => (
              <Chip key={`${highlight.label}-${highlight.detail}`} className={toneClasses(highlight.tone)}>
                {highlight.label}
                <b className="font-semibold tabular-nums opacity-90">{highlight.detail}</b>
              </Chip>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-[11.5px] text-muted-foreground backdrop-blur",
        className,
      )}
    >
      {children}
    </span>
  );
}
