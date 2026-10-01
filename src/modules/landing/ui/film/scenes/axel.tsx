import { Gauge, Megaphone, RotateCcw, Sparkles, type LucideIcon } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";
import { SceneHead } from "@/modules/landing/ui/film/parts/SceneHead";

/**
 * Axel (plan §11, lienzo aprobado el 2026-09-30): el horizonte. Axel escribe su
 * resumen con cursor, amanece sobre una línea que cruza la pantalla de lado a
 * lado y suben sus tres propuestas. El violeta queda solo en la marca de Axel.
 *
 * El horizonte era el hilo de luz; con el hilo archivado (plan §15) es una línea
 * propia de la escena, que se traza con el progreso del pin.
 */

const PROPOSAL_ICONS: Record<string, LucideIcon> = {
  Recuperación: RotateCcw,
  Campaña: Megaphone,
  Promoción: Megaphone,
  Recompra: RotateCcw,
  "Ritmo de la meta": Gauge,
};

export function AxelScene() {
  return (
    <section id="axel" data-scene="axel" aria-labelledby="axel-h" className="film-scene film-axel">
      <div className="film-wrap film-wrap-wide">
        <div className="grid items-start gap-x-[clamp(24px,8vw,140px)] gap-y-8 lg:grid-cols-[minmax(0,520px)_minmax(0,520px)] lg:justify-between">
          <SceneHead
            id="axel-h"
            eyebrow="Crecer · Axel"
            strong="Cada mañana,"
            thin="un plan."
            lead={
              <span className="max-lg:hidden">Axel, tu director comercial con IA, revisa tus números y te propone qué hacer. Tú decides.</span>
            }
          />
          <ByNiche>
            {(c) => (
              <div className="min-w-0 lg:pt-2.5">
                <div className="flex items-center gap-3.5">
                  <span className="film-axel-mark" data-anim="axel-mark" aria-hidden="true">
                    <Sparkles className="size-5 fill-current" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">Axel</p>
                    <p className="film-dim mt-0.5 text-xs">Tu director comercial con IA · hoy</p>
                  </div>
                </div>
                <p className="film-h mt-[22px] text-[clamp(26px,2.8vw,40px)] tracking-[-0.03em] max-lg:mt-4">Hola, {c.axel.name}</p>
                <p className="mt-3 text-[clamp(14px,1.2vw,17px)] leading-relaxed max-lg:text-[color-mix(in_srgb,var(--foreground)_80%,transparent)]" data-anim="axel-summary" data-text={c.axel.summary}>
                  {/* El motor lo escribe letra a letra; el lector de pantalla lee la frase entera. */}
                  <span className="sr-only">{c.axel.summary}</span>
                  <span data-anim="axel-typed" aria-hidden="true">
                    {c.axel.summary}
                  </span>
                  <span className="film-axel-caret" data-anim="axel-caret" aria-hidden="true" />
                  <span className="text-transparent" data-anim="axel-rest" aria-hidden="true" />
                </p>
                <div className="mt-4 flex flex-wrap gap-2 max-lg:hidden" data-anim="axel-chips">
                  {c.axel.chips.map((chip) => (
                    <span key={chip} className="film-chip">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </ByNiche>
        </div>

        {/* El horizonte: la luz del amanecer sobre la línea y un suelo tenue debajo. */}
        <div className="film-horizon-block" aria-hidden="true">
          <div className="film-dawn">
            <span data-anim="axel-dawn" />
          </div>
          <div className="film-ground" />
          <div className="film-horizon" data-anim="axel-horizon" data-thread-target="" />
        </div>

        <ByNiche>
          {(c) => (
            <ul className="grid gap-[30px] lg:mx-[clamp(0px,4vw,60px)] lg:grid-cols-3 max-lg:gap-3">
              {c.axel.proposals.map((p, i) => {
                const Icon = PROPOSAL_ICONS[p.type] ?? Sparkles;
                const finding = p.status === "Hallazgo";
                return (
                  <li key={p.title} className={cn("film-proposal", i === 2 && "max-lg:hidden")} data-anim="axel-proposal">
                    <span className="flex items-center justify-between gap-2">
                      <span className="film-lead flex min-w-0 items-center gap-2.5 text-xs">
                        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-lg bg-foreground max-lg:hidden">
                          <Icon className="size-3.5 text-background" aria-hidden="true" />
                        </span>
                        <span className="truncate">{p.type}</span>
                      </span>
                      <span className="film-dim shrink-0 text-[11px]">{p.status}</span>
                    </span>
                    <span className="text-base leading-snug font-semibold max-lg:text-sm">{p.title}</span>
                    <span className="film-dim text-xs max-lg:hidden">{p.meta}</span>
                    {/* Son la maqueta de la bandeja de Axel: se ven como botones, no lo son. */}
                    <span className="mt-auto flex gap-2 pt-1" aria-hidden="true">
                      {finding ? (
                        <span className="film-pill-ghost">Ver el detalle</span>
                      ) : (
                        <>
                          <span className="film-pill-solid">Aprobar</span>
                          <span className="film-pill-ghost">Ahora no</span>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </ByNiche>
        <p className="film-dim mt-7 text-center text-[12.5px] max-lg:mt-5" data-anim="axel-foot">
          Nada sale sin tu aprobación.
        </p>
      </div>
    </section>
  );
}
