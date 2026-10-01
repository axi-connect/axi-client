import { ArrowUp, CornerUpLeft, CornerUpRight, Flag, Navigation, type LucideIcon } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";
import { SceneHead } from "@/modules/landing/ui/film/parts/SceneHead";
import { MAP_HEIGHT, MAP_WIDTH, ROAD_PATH, cityBlocks, roadPercentAt } from "@/modules/landing/domain/film/route-map";
import { formatMillions, formatPercent, formatPesos, routeScenario } from "@/modules/landing/domain/film/route-scenario";

/* ─────────────────────────────── La meta ─────────────────────────────── */

const STEP_ICONS: readonly LucideIcon[] = [CornerUpRight, CornerUpLeft, ArrowUp];
const BLOCKS = cityBlocks();

function Mark({ fraction, children, className, anim }: { fraction: number; children: React.ReactNode; className?: string; anim?: string }) {
  return (
    <div className={cn("film-mark", className)} style={roadPercentAt(fraction)} data-anim={anim} data-fraction={fraction}>
      {children}
    </div>
  );
}

export function GoalScene() {
  return (
    <section
      id="crecer"
      data-scene="goal"
      data-chapter="Crecer"
      aria-labelledby="meta-h"
      className="film-scene max-lg:!grid max-lg:grid-cols-1 max-lg:content-start max-lg:px-4 max-lg:pt-[88px] max-lg:pb-[88px]"
    >
      {/* La ventana del mapa: cubre la escena en escritorio; en móvil es una franja
          propia entre el titular y el panel, para que «Vas aquí» no quede debajo. */}
      <div className="absolute inset-0 z-0 overflow-hidden max-lg:relative max-lg:inset-auto max-lg:order-2 max-lg:-mx-4 max-lg:h-[360px]" aria-hidden="true">
      {/* El lienzo 16:10: «cover» en escritorio sin deformar las coordenadas de las marcas. */}
      <div
        className="absolute top-1/2 left-1/2 aspect-[16/10] w-[max(100%,160svh)] -translate-1/2 max-lg:top-[-150px] max-lg:left-[-230px] max-lg:w-[900px] max-lg:translate-none"
        data-anim="map"
      >
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="absolute inset-0 size-full">
          {BLOCKS.map((b) => (
            <rect key={`${b.x}-${b.y}`} x={b.x} y={b.y} width={b.w} height={b.h} rx={7} className="fill-[color-mix(in_srgb,var(--foreground)_5%,var(--background))]" />
          ))}
          <path
            d="M -20 162 C 432 45, 648 378, 1008 270 S 1480 450, 1480 450"
            className="fill-none stroke-[color-mix(in_srgb,var(--axi-violet)_10%,transparent)]"
            strokeWidth={46}
          />
          <rect x={115} y={288} width={190} height={150} rx={20} className="fill-[color-mix(in_srgb,var(--axi-success)_6%,transparent)]" />
          <defs>
            <linearGradient id="film-road" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="var(--axi-brand)" />
              <stop offset=".6" stopColor="var(--axi-amber)" />
              <stop offset="1" stopColor="var(--axi-violet)" />
            </linearGradient>
          </defs>
          <path d={ROAD_PATH} className="fill-none stroke-[color-mix(in_srgb,var(--foreground)_9%,var(--background))]" strokeWidth={26} strokeLinecap="round" />
          <path d={ROAD_PATH} className="fill-none stroke-[color-mix(in_srgb,var(--foreground)_35%,transparent)]" strokeWidth={3.6} strokeLinecap="round" strokeDasharray="1 12" />
          <path d={ROAD_PATH} pathLength={1} data-anim="road-glow" className="fill-none opacity-70 blur-[10px]" stroke="url(#film-road)" strokeWidth={18} strokeDasharray="0.63 2" />
          <path d={ROAD_PATH} pathLength={1} data-anim="road" className="fill-none" stroke="url(#film-road)" strokeWidth={8} strokeLinecap="round" strokeDasharray="0.63 2" />
          <path d={ROAD_PATH} pathLength={1} data-anim="road-slow" className="fill-none stroke-[var(--axi-amber)]" strokeWidth={8} strokeLinecap="round" strokeDasharray="0 0.63 0.087 2" />
        </svg>
        {/* El velo que oscurece la ciudad detrás del titular: por DEBAJO de las marcas. */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--background)_92%,transparent)_0%,color-mix(in_srgb,var(--background)_50%,transparent)_34%,transparent_60%),linear-gradient(0deg,color-mix(in_srgb,var(--background)_85%,transparent),transparent_26%)] max-lg:hidden" />

        <ByNiche>
          {(c) => {
            const s = routeScenario(c.route);
            return (
              <>
                <Mark fraction={0} className="translate-x-[10%] -translate-y-[160%]">
                  <span className="film-chip bg-[color-mix(in_srgb,var(--background)_85%,transparent)] text-xs">
                    <Navigation className="size-3" aria-hidden="true" />
                    Salida · 1 oct
                  </span>
                </Mark>
                <Mark fraction={s.expected} anim="should">
                  <span className="block size-5 rounded-full border-2 border-foreground bg-background" />
                </Mark>
                <Mark fraction={0.675} anim="slow" className="-translate-x-full -translate-y-[170%] max-lg:hidden">
                  <span className="film-chip border-[color-mix(in_srgb,var(--axi-amber)_35%,transparent)] bg-[color-mix(in_srgb,var(--background)_85%,transparent)] text-xs whitespace-nowrap text-[var(--axi-amber)]">
                    Tramo lento · vas {formatMillions(s.behind)} por debajo
                  </span>
                </Mark>
                <Mark fraction={s.projected} anim="projection">
                  <span className="block size-[22px] rounded-full border-2 border-dashed border-foreground" />
                  <span className="absolute bottom-8 left-[-150px] rounded-xl bg-foreground px-3 py-2 text-xs whitespace-nowrap text-background max-lg:hidden">
                    <strong data-anim="projection-pct">{formatPercent(s.projected)}</strong> · Si sigues así llegas a{" "}
                    <span data-anim="projection-value" data-goal={s.goal}>
                      {formatMillions(s.goal * s.projected)}
                    </span>
                  </span>
                </Mark>
                <Mark fraction={1} className="-translate-y-[110%]">
                  <span className="flex size-11 -rotate-45 items-center justify-center rounded-[50%_50%_50%_4px] bg-foreground">
                    <Flag className="size-[18px] rotate-45 text-background" />
                  </span>
                </Mark>
                <Mark fraction={s.done} anim="here">
                  <span className="relative flex size-[30px] items-center justify-center rounded-full bg-[var(--axi-brand)] text-background shadow-[0_0_0_5px_color-mix(in_srgb,var(--background)_90%,transparent),0_0_30px_var(--axi-brand)] before:absolute before:-inset-6 before:rounded-full before:bg-[color-mix(in_srgb,var(--axi-brand)_18%,transparent)]">
                    <Navigation className="relative size-3.5" />
                  </span>
                  <span className="film-glass absolute top-9 right-3 rounded-2xl px-3.5 py-2.5 whitespace-nowrap max-lg:right-auto max-lg:left-[-12px]">
                    <span className="film-eyebrow block text-[9.5px] text-[var(--axi-brand)]">Vas aquí</span>
                    <span className="film-h text-[22px] tabular-nums" data-anim="here-value" data-goal={s.goal}>
                      {formatMillions(s.reached)} · {formatPercent(s.done)}
                    </span>
                  </span>
                </Mark>
              </>
            );
          }}
        </ByNiche>
      </div>
      </div>

      <div className="film-wrap grid gap-10 max-lg:contents lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
        <SceneHead
          id="meta-h"
          eyebrow="Crecer"
          strong="Tú pones la meta."
          thin="Axi traza la ruta."
          lead="Tu meta del mes se vuelve un camino con indicaciones para hoy. Si vas lento, Axi te prepara otra ruta."
          className="self-start max-lg:order-1"
        />
        <ByNiche>
          {(c) => {
            const s = routeScenario(c.route);
            return (
              <div data-anim="navpanel" className="film-glass relative z-[3] flex flex-col gap-3 rounded-[26px] p-5 max-lg:order-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="film-dim text-xs">Destino · octubre</p>
                    <p className="film-h text-[26px] tabular-nums max-lg:text-[21px]">Vender {formatPesos(s.goal)}</p>
                  </div>
                  <span className="film-dim text-[12.5px]">Tu meta</span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="film-chip border-[color-mix(in_srgb,var(--axi-amber)_35%,transparent)] bg-[color-mix(in_srgb,var(--axi-amber)_8%,transparent)] text-[var(--axi-amber)]">Ritmo bajo</span>
                  <span className="film-dim text-xs">{s.businessDaysLeft} días hábiles · hasta el 30 oct</span>
                </div>
                <p className="text-[15px]">
                  Para llegar faltan {formatMillions(s.remaining)}:{" "}
                  <strong>
                    {s.perDay} {s.unitPlural} al día
                  </strong>{" "}
                  en los {s.businessDaysLeft} días hábiles que quedan.
                </p>
                <p className="film-dim text-[11.5px] max-lg:hidden">Ticket promedio {formatMillions(s.ticket)} · según tu historia</p>
                <div className="h-px bg-[var(--film-line)] max-lg:hidden" />
                <p className="film-eyebrow film-dim text-[10px] max-lg:hidden">Indicaciones de hoy</p>
                <ul className="flex flex-col gap-2.5 max-lg:hidden">
                  {c.route.steps.map((step, i) => {
                    const Icon = STEP_ICONS[i];
                    return (
                      <li key={step} data-anim="step" className="flex items-center gap-3 text-[13.5px]">
                        <span className="flex size-[30px] items-center justify-center rounded-[9px] bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)]">
                          <Icon className="size-[15px]" aria-hidden="true" />
                        </span>
                        {step}
                      </li>
                    );
                  })}
                </ul>
                <div className="h-px bg-[var(--film-line)]" />
                <p className="film-eyebrow text-[10px] text-[var(--axi-violet)]">Rutas · las prepara Axi</p>
                <div className="flex flex-col gap-2" role="list">
                  <div role="listitem" data-anim="route-now" className="flex items-center justify-between gap-3 rounded-xl border border-[var(--film-line)] px-3 py-2.5 text-[13px] max-lg:hidden">
                    <span className="flex items-center gap-2">
                      <span className="size-3.5 rounded-full border-[1.5px] border-[var(--film-dim)]" />
                      Seguir al ritmo de hoy
                    </span>
                    <span className="film-lead tabular-nums">{formatPercent(s.projected)}</span>
                  </div>
                  <div role="listitem" data-anim="route-axi" className="flex items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--axi-violet)_55%,transparent)] bg-[color-mix(in_srgb,var(--axi-violet)_10%,transparent)] px-3 py-2.5 text-[13px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-3.5 shrink-0 rounded-full border-4 border-[var(--axi-violet)]" />
                      <span className="truncate">{c.route.axiRoute}</span>
                    </span>
                    <strong className="shrink-0 tabular-nums">{formatPercent(s.projectedWithRoute)}</strong>
                  </div>
                </div>
                <p className="film-dim text-center text-[11.5px]">Axi propone; tú apruebas. Nada se envía sin tu aprobación.</p>
              </div>
            );
          }}
        </ByNiche>
      </div>
    </section>
  );
}
