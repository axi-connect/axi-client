"use client";

import { Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { toneClasses } from "@/modules/cmo/domain/proposal-labels";
import type { BriefingDTO } from "@/modules/cmo/domain/cmo";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface BriefingHeroProps {
  briefing: BriefingDTO | null;
  loading: boolean;
  /** Hora local a la que corre el briefing, de los ajustes del tenant. */
  briefingHour: number;
}

/**
 * El briefing del día.
 *
 * El caso que decide el diseño de este componente NO es el feliz: es el de un
 * tenant que acaba de encender a Axel y todavía no ha tenido su primer análisis.
 * Ese estado es **normal**, no un error ni un vacío que haya que disimular, así
 * que dice exactamente qué va a pasar y cuándo — «mañana a las 8» — en vez de
 * un "sin datos" que dejaría al dueño pensando que algo se rompió.
 */
export function BriefingHero({ briefing, loading, briefingHour }: BriefingHeroProps) {
  if (loading && briefing === null) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-float">
        <div className="bg-brand-gradient-tri h-[3px]" />
        <div className="flex flex-col gap-3 p-5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      </div>
    );
  }

  if (briefing === null) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-float">
        <div className="bg-brand-gradient-tri h-[3px]" />
        <div className="p-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-violet/30 bg-accent-violet/10 px-2.5 py-1 text-[11px] font-semibold text-accent-violet">
            <Sparkles className="size-3" aria-hidden="true" />
            Primer análisis pendiente
          </span>
          <p className="font-heading mt-3 text-lg leading-snug">
            Axel todavía no ha revisado tu negocio.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Su primer informe llega mañana a las {formatHour(briefingHour)}, con tus números
            y lo que valga la pena hacer esta semana. Si no quieres esperar, pregúntale
            ahora mismo aquí al lado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-background shadow-float",
        loading && "opacity-60 transition-opacity",
      )}
    >
      <div className="bg-brand-gradient-tri h-[3px]" />
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-violet/30 bg-accent-violet/10 px-2.5 py-1 text-[11px] font-semibold text-accent-violet">
            <Sparkles className="size-3" aria-hidden="true" />
            Briefing de {formatDay(briefing.date_local)}
          </span>
        </div>

        <p className="font-heading mt-3 text-lg leading-snug font-light text-balance">
          {briefing.summary}
        </p>

        {briefing.highlights.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-4">
            {briefing.highlights.map((highlight) => (
              <span
                key={`${highlight.label}-${highlight.detail}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                  toneClasses(highlight.tone),
                )}
              >
                {highlight.label}
                <span className="tabular-nums opacity-80">{highlight.detail}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * `date_local` es el día LOCAL del negocio (YYYY-MM-DD), no un instante: se
 * formatea partiendo la cadena y NO con `new Date(...)`, porque interpretarla
 * como UTC restaría un día en cualquier zona al oeste de Greenwich — y este
 * módulo es para Colombia.
 */
function formatDay(dateLocal: string): string {
  const [year, month, day] = dateLocal.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return dateLocal;
  const formatter = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long" });
  return formatter.format(new Date(year, month - 1, day));
}

function formatHour(hour: number): string {
  const suffix = hour < 12 ? "a.m." : "p.m.";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(twelve)}:00 ${suffix}`;
}
