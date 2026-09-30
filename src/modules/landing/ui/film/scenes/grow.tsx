import { ArrowUp, CalendarCheck, CornerUpLeft, CornerUpRight, Flag, Gauge, Megaphone, Navigation, RotateCcw, Sparkles, type LucideIcon } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";
import { Bubble } from "@/modules/landing/ui/film/parts/chat";
import { SceneHead } from "@/modules/landing/ui/film/parts/SceneHead";
import { MAP_HEIGHT, MAP_WIDTH, ROAD_PATH, cityBlocks, roadPercentAt } from "@/modules/landing/domain/film/route-map";
import { formatMillions, formatPercent, formatPesos, routeScenario } from "@/modules/landing/domain/film/route-scenario";

/* ─────────────────────────────── Cobrar ─────────────────────────────── */

export function CollectScene() {
  return (
    <section id="cobrar" data-scene="collect" data-chapter="Cobrar" aria-labelledby="cobrar-h" className="film-scene">
      <div className="film-spot top-[15%] left-[30%] size-[900px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_10%,transparent),transparent)]" />
      <div className="film-wrap">
        <SceneHead
          id="cobrar-h"
          eyebrow="Cobrar"
          strong="Cada venta,"
          thin="cobrada."
          lead="Abonos que se reparten solos, recordatorios que suenan a conversación y el recibo listo para enviar."
        />
        <ByNiche>
          {(c) => {
            const total = c.collect.parts.length + 1;
            return (
              <div className="mt-12 grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,.7fr)] max-lg:mt-8">
                <div data-anim="order" className="film-glass flex flex-col gap-4 rounded-3xl p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="film-dim text-xs">{c.collect.order}</p>
                      <p className="truncate font-semibold">{c.collect.customer}</p>
                    </div>
                    <span className="film-chip shrink-0">Abonado</span>
                  </div>
                  <div>
                    <p className="film-dim text-xs">Cobro del pedido</p>
                    <p className="film-h text-[34px] tabular-nums">{c.collect.total}</p>
                  </div>
                  <div className="flex h-3 gap-[3px] overflow-hidden rounded-full" aria-hidden="true">
                    {c.collect.parts.map(([label]) => (
                      <span key={label} data-anim="segment" className="origin-left bg-[var(--axi-brand)]" style={{ flex: 1 }} />
                    ))}
                    <span className="bg-[var(--film-line)]" style={{ flex: 1 }} />
                  </div>
                  <dl className="flex flex-col gap-2 text-[13px]">
                    {c.collect.parts.map(([label, amount]) => (
                      <div key={label} data-anim="row" className="flex justify-between gap-3">
                        <dt>{label}</dt>
                        <dd className="tabular-nums">{amount}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between gap-3 font-semibold">
                      <dt>Falta por cobrar</dt>
                      <dd className="tabular-nums">{c.collect.remaining}</dd>
                    </div>
                  </dl>
                  <p className="film-dim text-[11.5px]">
                    {total - 1} de {total} pagos verificados por tu equipo
                  </p>
                </div>
                <div data-anim="reminders" className="film-card flex flex-col gap-3 rounded-3xl p-5">
                  <p className="film-eyebrow film-dim text-[10px]">Antes de vencer</p>
                  <Bubble side="out" meta="WhatsApp · 14 oct">
                    {c.collect.reminder}
                  </Bubble>
                  <Bubble side="in" meta="14 oct">
                    {c.collect.promiseReply}
                  </Bubble>
                  <p data-anim="msg">
                    <span className="film-chip">
                      <CalendarCheck className="size-3.5 text-[var(--axi-amber)]" aria-hidden="true" />
                      {c.collect.promise}
                    </span>
                  </p>
                </div>
                <div data-anim="document" className="flex items-center gap-4 lg:flex-col lg:items-start">
                  <div className="flex h-24 w-[74px] shrink-0 flex-col gap-1.5 rounded-lg bg-foreground p-2.5 shadow-[0_20px_50px_rgb(0_0_0/.6)]" aria-hidden="true">
                    <span className="h-1.5 w-3/5 rounded bg-[color-mix(in_srgb,var(--background)_30%,var(--foreground))]" />
                    <span className="h-1 w-[90%] rounded bg-[color-mix(in_srgb,var(--background)_16%,var(--foreground))]" />
                    <span className="h-1 w-4/5 rounded bg-[color-mix(in_srgb,var(--background)_16%,var(--foreground))]" />
                    <span className="h-1 w-[85%] rounded bg-[color-mix(in_srgb,var(--background)_16%,var(--foreground))]" />
                    <span className="mt-auto h-1.5 w-2/5 rounded bg-[var(--axi-brand)]" />
                  </div>
                  <div>
                    <p className="font-semibold">{c.collect.document}</p>
                    <p className="film-dim text-[12.5px]">PDF · enviado por WhatsApp</p>
                  </div>
                </div>
              </div>
            );
          }}
        </ByNiche>
      </div>
    </section>
  );
}

/* ────────────────────────────── Pipeline ────────────────────────────── */

const COLUMNS = [
  ["Nuevo", 6],
  ["Contactado", 4],
  ["Cita", 3],
  ["Propuesta", 5],
  ["Compromiso", 2],
] as const;

export function PipelineScene() {
  return (
    <section id="ordenar" data-scene="pipeline" aria-labelledby="ordenar-h" className="film-scene">
      <div className="film-spot top-[20%] right-[10%] size-[860px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-violet)_8%,transparent),transparent)]" />
      <div className="film-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]">
        <SceneHead
          id="ordenar-h"
          eyebrow="Ordenar"
          tone="violet"
          strong="Todo queda"
          thin="en su lugar."
          lead="Cada conversación abre su oportunidad, agenda lo que haga falta y avanza sola en tu pipeline."
        />
        <ByNiche>
          {(c) => (
            <div className="min-w-0">
              <div data-anim="board" className="film-card overflow-hidden rounded-3xl p-5">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <strong>Pipeline</strong>
                  <span className="film-lead text-[12.5px]">
                    Pronóstico ponderado <strong className="text-foreground tabular-nums">{c.pipeline.forecast}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-3 max-md:grid-cols-2">
                  {COLUMNS.map(([name, n], ci) => (
                    <div key={name} className={cn("flex min-w-0 flex-col gap-2.5", ci < 3 && "max-md:hidden")}>
                      <div className="flex justify-between text-[12.5px]">
                        <strong className="truncate">{name}</strong>
                        <span className="film-dim tabular-nums">{n}</span>
                      </div>
                      {[0, 1, 2].map((k) => {
                        if (ci === 4 && k === 0) {
                          return (
                            <div key={k} data-anim="deal" className="rounded-2xl border border-[color-mix(in_srgb,var(--axi-brand)_50%,transparent)] bg-[var(--film-surface-2)] p-3 shadow-[0_18px_50px_color-mix(in_srgb,var(--axi-brand)_18%,transparent)]">
                              <p className="truncate text-[12.5px] font-semibold">{c.pipeline.card.name}</p>
                              <p className="film-dim text-[11.5px]">{c.pipeline.card.detail}</p>
                              <span className="film-chip mt-2 min-h-[22px] px-2 py-0 text-[10.5px]">
                                <Sparkles className="size-2.5 text-[var(--axi-violet)]" aria-hidden="true" />
                                La abrió Axi
                              </span>
                            </div>
                          );
                        }
                        if (ci === 3 && k === 0) return <div key={k} data-anim="ghost" className="h-[92px] rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--foreground)_18%,transparent)]" />;
                        return (
                          <div key={k} className="rounded-2xl border border-[var(--film-line)] bg-[var(--film-surface-2)] p-3" aria-hidden="true">
                            <span className="block h-[7px] rounded bg-[color-mix(in_srgb,var(--foreground)_22%,transparent)]" style={{ width: `${60 + 9 * k}%` }} />
                            <span className="mt-2 block h-1.5 w-2/5 rounded bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]" />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div data-anim="appointment" className="film-glass mt-5 ml-auto flex w-full max-w-[340px] items-center gap-3.5 rounded-2xl p-4">
                <span className="flex h-14 w-[52px] shrink-0 flex-col items-center justify-center rounded-xl bg-foreground text-background">
                  <span className="text-[10px] font-semibold">{c.pipeline.appointment.weekday}</span>
                  <span className="film-h text-[22px] leading-none">{c.pipeline.appointment.day}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold">
                    {c.pipeline.appointment.time} · {c.pipeline.appointment.title}
                  </span>
                  <span className="film-dim block text-xs">{c.pipeline.appointment.who}</span>
                </span>
              </div>
            </div>
          )}
        </ByNiche>
      </div>
    </section>
  );
}

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

/* ─────────────────────────────── Axel ─────────────────────────────── */

const PROPOSAL_ICONS: Record<string, LucideIcon> = {
  Recuperación: RotateCcw,
  Campaña: Megaphone,
  Promoción: Megaphone,
  Recompra: RotateCcw,
  "Ritmo de la meta": Gauge,
};

export function AxelScene() {
  return (
    <section id="axel" data-scene="axel" aria-labelledby="axel-h" className="film-scene">
      <div className="film-spot top-[10%] right-[5%] size-[900px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-violet)_16%,transparent),transparent)]" />
      <div className="film-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]">
        <SceneHead
          id="axel-h"
          eyebrow="Crecer"
          tone="violet"
          strong="Cada mañana,"
          thin="un plan."
          lead="Axel, tu director comercial con IA, revisa tus números y te propone qué hacer. Tú decides."
        />
        <ByNiche>
          {(c) => (
            <div data-anim="brief" className="min-w-0">
              <div className="flex items-center gap-3.5">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,color-mix(in_srgb,var(--axi-violet)_30%,var(--background)),var(--background))] text-xl text-[var(--axi-violet)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--axi-violet)_40%,transparent),0_0_50px_color-mix(in_srgb,var(--axi-violet)_40%,transparent)]" aria-hidden="true">
                  ✦
                </span>
                <div>
                  <p className="text-xs font-semibold text-[var(--axi-violet)]">✦ Axel</p>
                  <p className="film-h text-[30px]">Hola, {c.axel.name}</p>
                </div>
              </div>
              <p data-anim="summary" className="mt-4 mb-3.5 max-w-[620px] text-[17px] leading-relaxed">
                {c.axel.summary}
              </p>
              <div className="mb-6 flex flex-wrap gap-2">
                {c.axel.chips.map((chip) => (
                  <span key={chip} className="film-chip">
                    {chip}
                  </span>
                ))}
              </div>
              <ul className="grid gap-3.5 md:grid-cols-3">
                {c.axel.proposals.map((p) => {
                  const Icon = PROPOSAL_ICONS[p.type] ?? Sparkles;
                  return (
                    <li key={p.title} data-anim="proposal" className="film-card flex flex-col gap-2.5 rounded-[20px] p-4">
                      <span className="flex items-center justify-between gap-2">
                        <span className="film-lead flex min-w-0 items-center gap-2 text-xs">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-foreground">
                            <Icon className="size-3.5 text-background" aria-hidden="true" />
                          </span>
                          <span className="truncate">{p.type}</span>
                        </span>
                        <span className="film-dim shrink-0 text-[11px]">{p.status}</span>
                      </span>
                      <span className="text-[14.5px] leading-snug font-semibold">{p.title}</span>
                      <span className="film-dim text-xs">{p.meta}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="film-dim mt-4 text-xs">Nada sale sin tu aprobación.</p>
            </div>
          )}
        </ByNiche>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Medir ─────────────────────────────── */

const BAR_HEIGHTS = [1, 0.72, 0.5, 0.38] as const;

export function MeasureScene() {
  return (
    <section id="medir" data-scene="measure" aria-labelledby="medir-h" className="film-scene">
      <div className="film-spot top-[30%] left-[calc(50%-560px)] size-[1120px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_9%,transparent),transparent)]" />
      <div className="film-wrap">
        <SceneHead id="medir-h" eyebrow="Medir" strong="Sabes cuánto te vendió" thin="cada conversación." />
        <ByNiche>
          {(c) => (
            <div className="mt-12 grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_260px] max-lg:mt-8">
              <ol className="grid grid-cols-4 items-end gap-5 max-sm:gap-2.5" aria-label="Embudo de ventas de ejemplo">
                {c.measure.steps.map(([label, value], i) => (
                  <li key={label} className="flex min-w-0 flex-col justify-end">
                    <span
                      data-anim="bar"
                      aria-hidden="true"
                      className="block origin-bottom rounded-t-[18px] rounded-b-md border border-[var(--film-line)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--foreground)_14%,transparent),color-mix(in_srgb,var(--foreground)_3%,transparent))]"
                      style={{ height: `calc(${BAR_HEIGHTS[i]} * min(38svh, 360px))` }}
                    />
                    <span className="film-h mt-3 text-[clamp(22px,2.8vw,40px)] tabular-nums" data-anim="count">
                      {value}
                    </span>
                    <span className="film-lead text-[13px] max-sm:text-[11px]">{label}</span>
                  </li>
                ))}
              </ol>
              <div className="flex flex-col gap-5">
                <div>
                  <p className="film-eyebrow text-[10px] text-[var(--axi-brand)]">Lo que produjeron</p>
                  <p className="film-h bg-[linear-gradient(90deg,var(--axi-brand),var(--axi-amber))] bg-clip-text text-[clamp(40px,4vw,54px)] whitespace-nowrap text-transparent tabular-nums">
                    {c.measure.produced}
                  </p>
                  <p className="film-lead text-[13px]">en ventas pagadas este mes</p>
                </div>
                <div className="film-glass rounded-2xl p-4">
                  <p className="flex items-baseline gap-1.5">
                    <span className="film-h text-[28px] tabular-nums">{c.measure.quality}</span>
                    <span className="film-dim">/ 100</span>
                  </p>
                  <p className="text-[12.5px]">Calidad del agente</p>
                  <p className="film-dim text-[11px]">evaluada por una IA supervisora</p>
                </div>
                <span className="film-chip w-fit">Cifras de ejemplo</span>
              </div>
            </div>
          )}
        </ByNiche>
      </div>
    </section>
  );
}
