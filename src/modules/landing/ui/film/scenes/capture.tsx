import { CircleCheck } from "lucide-react";

import type { FilmContent } from "@/modules/landing/domain/film/film-content";
import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";
import { SceneHead } from "@/modules/landing/ui/film/parts/SceneHead";

/* ───────────────────────────── Radar ───────────────────────────── */

/**
 * Radar (plan §13, lienzo aprobado el 2026-09-30): un instrumento de precisión.
 * Esfera con 60 marcas y 12 mayores en SVG estático, barrido blanco que da dos
 * vueltas, los hallazgos como puntos y la ficha del cliente que sale del
 * objetivo con una línea guía. Todo en tinta.
 */

/** Puntos (ángulo desde +x en sentido horario, radio 0–1, brillo). Fijos: servidor y cliente coinciden. */
const RADAR_DOTS: readonly [angle: number, radius: number, strength: number][] = [
  [12, 0.42, 0.3], [40, 0.8, 0.25], [66, 0.3, 0.45], [95, 0.62, 0.35], [120, 0.9, 0.25], [150, 0.5, 0.4],
  [178, 0.74, 0.3], [205, 0.36, 0.5], [230, 0.86, 0.25], [258, 0.55, 0.35], [285, 0.24, 0.45], [310, 0.7, 0.3],
  [335, 0.46, 0.4], [350, 0.92, 0.25], [80, 0.95, 0.2], [190, 0.16, 0.3],
];
const RADAR_HITS: readonly [angle: number, radius: number][] = [[305, 0.62], [200, 0.72], [110, 0.5]];

function polar(angle: number, radius: number) {
  const a = (angle * Math.PI) / 180;
  return { left: `${50 + 50 * radius * Math.cos(a)}%`, top: `${50 + 50 * radius * Math.sin(a)}%` };
}

/** Las marcas de la esfera (viewBox 500): cada `step` grados, de `len` px hacia dentro. */
function ticks(step: number, len: number) {
  let d = "";
  for (let a = 0; a < 360; a += step) {
    const t = (a * Math.PI) / 180;
    const c = Math.cos(t);
    const s = Math.sin(t);
    d += `M${(250 + 249 * c).toFixed(1)} ${(250 + 249 * s).toFixed(1)} L${(250 + (249 - len) * c).toFixed(1)} ${(250 + (249 - len) * s).toFixed(1)} `;
  }
  return d.trim();
}
const MINOR_TICKS = ticks(6, 7);
const MAJOR_TICKS = ticks(30, 14);

function RadarCard({ c }: { c: FilmContent }) {
  const r = c.radar;
  return (
    <div data-anim="lead" data-thread-target="" className="film-lead-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold max-lg:text-sm">{r.lead}</p>
          <p className="film-ink-muted mt-0.5 text-xs max-lg:text-[11px]">{r.place}</p>
        </div>
        <span className="film-ink-chip">Calificado</span>
      </div>
      <p className="flex items-baseline gap-2.5">
        <span className="film-h text-[64px] leading-none tracking-[-0.04em] tabular-nums max-lg:text-[44px]" data-anim="score" data-to={r.score}>
          {r.score}
        </span>
        <span className="film-ink-muted text-[12.5px] max-lg:text-[11px]">/ 100 · índice de calidad</span>
      </p>
      <div className="flex flex-col gap-[7px] max-lg:hidden">
        {r.axes.map(([name, value]) => (
          <div key={name} className="grid grid-cols-[minmax(0,1fr)_clamp(64px,7vw,110px)_24px] items-center gap-2.5 text-xs">
            <span className="film-ink-muted leading-tight">{name}</span>
            <span className="h-1 rounded-sm bg-[color-mix(in_srgb,var(--background)_10%,transparent)]">
              <span data-anim="axis" className="block h-full origin-left rounded-sm bg-[var(--background)]" style={{ width: `${value}%` }} />
            </span>
            <span className="text-right tabular-nums">{value}</span>
          </div>
        ))}
      </div>
      {r.decisor ? (
        <div data-anim="radar-sources" className="rounded-2xl border border-[color-mix(in_srgb,var(--background)_14%,transparent)] p-3 max-lg:hidden">
          <p className="film-ink-muted text-[10px] font-semibold tracking-[0.18em] uppercase">Decisor</p>
          <p className="mt-1 text-[13px] font-semibold">
            {r.decisor.name} · {r.decisor.role}
          </p>
          <p className="film-ink-muted text-xs">{r.decisor.confidence}</p>
        </div>
      ) : null}
      <div className="h-px bg-[color-mix(in_srgb,var(--background)_12%,transparent)] max-lg:hidden" />
      <p className="film-ink-muted text-xs max-lg:hidden" data-anim="radar-sources">
        {r.sources.join(" · ")}: encontró datos en los tres
      </p>
      <p className="text-[12.5px] font-semibold max-lg:text-[11.5px]" data-anim="radar-sources" data-pill-avoid="cover">
        {r.contactBy}
      </p>
    </div>
  );
}

export function RadarScene() {
  return (
    <section id="captar" data-scene="radar" data-chapter="Captar" aria-labelledby="radar-h" className="film-scene">
      <div className="film-spot top-[2%] left-[-4%] size-[900px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--foreground)_5%,transparent),transparent)]" />
      <div className="film-wrap film-wrap-wide grid items-start gap-x-[clamp(40px,8vw,120px)] gap-y-8 lg:grid-cols-[500px_minmax(0,560px)]">
        <div className="relative lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-[100px] lg:ml-5 max-lg:order-2">
          <div className="film-radar" data-anim="radar" aria-hidden="true">
            <svg viewBox="0 0 500 500" className="absolute inset-0 size-full">
              <circle cx="250" cy="250" r="249" className="film-radar-ring" strokeOpacity={0.18} />
              <circle cx="250" cy="250" r="187" className="film-radar-ring" strokeOpacity={0.1} />
              <circle cx="250" cy="250" r="125" className="film-radar-ring" strokeOpacity={0.08} />
              <circle cx="250" cy="250" r="62" className="film-radar-ring" strokeOpacity={0.07} />
              <path d="M250 0 V500 M0 250 H500" className="film-radar-ring" strokeOpacity={0.06} />
              <path d={MINOR_TICKS} className="film-radar-ring" strokeOpacity={0.3} />
              <path d={MAJOR_TICKS} className="film-radar-ring" strokeOpacity={0.7} strokeWidth={1.5} />
            </svg>
            <div className="film-radar-sweep" data-anim="sweep" />
            {RADAR_DOTS.map(([a, r, s]) => (
              <span key={`${a}-${r}`} data-anim="dot" data-angle={a} data-strength={s} className="film-radar-dot" style={{ ...polar(a, r), opacity: s }} />
            ))}
            {RADAR_HITS.map(([a, r]) => (
              <span key={`hit-${a}`} data-anim="hit" className="film-radar-hit" style={polar(a, r)} />
            ))}
            <span data-anim="target" className="film-radar-target" style={{ left: "63.6%", top: "43.6%" }} />
            <span className="film-dim absolute top-[-30px] left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] max-lg:hidden">N</span>
            {/* La línea guía del objetivo a la ficha (solo escritorio, donde la ficha está a la derecha). */}
            <svg className="film-radar-leader" viewBox="0 0 640 320" aria-hidden="true">
              <path d="M318 218 L 460 218 L 620 300" pathLength={1} data-anim="leader" />
            </svg>
          </div>
        </div>
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 max-lg:order-1">
          <SceneHead
            id="radar-h"
            eyebrow="Captar"
            size="md"
            strong="Encuentra a quien"
            thin="te va a comprar."
            lead={
              <ByNiche as="span">
                {(c) =>
                  c.radar.mode === "prospects"
                    ? "Axi recorre tu zona, califica cada negocio y te dice con quién hablar."
                    : "Tus anuncios traen conversaciones. Axi califica cada una y te dice con quién hablar primero."
                }
              </ByNiche>
            }
          />
        </div>
        <div className="min-w-0 lg:col-start-2 lg:row-start-2 lg:mt-[clamp(24px,6vh,80px)] max-lg:order-3">
          <ByNiche>{(c) => <RadarCard c={c} />}</ByNiche>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Seguimiento ─────────────────────────── */

/**
 * Seguimiento (plan §13 y §15): una regla de tiempo vertical, como la línea de
 * edición de un video. La regla se traza con el progreso de la escena y cada
 * evento aparece en su minuto; hay un tramo punteado «A la mañana siguiente» y
 * el fondo se aclara hacia la mañana. Las alturas van en px de la regla (660).
 */
function Timeline({ c }: { c: FilmContent }) {
  const f = c.followup;
  const events = [
    { y: 88, when: "Mar · 9:12 p. m.", what: f.cart },
    { y: 248, when: "Mié · 10:00 a. m.", what: "Axi retoma con una plantilla aprobada por Meta" },
    { y: 468, when: "10:07 a. m.", what: "Leída" },
    { y: 496, when: "10:09 a. m.", what: "" },
  ];
  return (
    <div className="film-ruler" data-anim="ruler">
      <span className="film-ruler-line" data-anim="ruler-line" />
      <span className="film-ruler-gap" />
      <p className="film-ruler-gap-label">A la mañana siguiente</p>
      {events.map((e) => (
        <div key={e.when} className={e.what ? "film-ruler-event" : "film-ruler-event film-ruler-tick"} style={{ top: ry(e.y), order: e.y }} data-anim="ruler-event" data-y={e.y}>
          <p className="film-ruler-when">{e.when}</p>
          <span className="film-ruler-dot" />
          {e.what ? <p className="film-ruler-what">{e.what}</p> : null}
        </div>
      ))}
      <p className="film-ruler-bub film-ruler-out" style={{ top: ry(282), order: 282 }} data-anim="ruler-event" data-y={282}>
        {f.template}
        <span className="mt-1 block text-[10.5px] opacity-50">Plantilla aprobada por Meta · entregada · leída</span>
      </p>
      <p className="film-ruler-bub film-ruler-in" style={{ top: ry(516), order: 516 }} data-anim="ruler-event" data-y={516}>
        {f.reply}
        <span className="mt-[3px] block text-[10.5px] opacity-45">10:09{" "}a.{" "}m.</span>
      </p>
      <div className="film-ruler-result" style={{ top: ry(602), order: 602 }} data-anim="ruler-event" data-y={602} data-thread-target="" data-pill-avoid="cover">
        <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
        <span>
          <span className="block text-sm font-semibold">{f.recovered}</span>
          <span className="film-ink-muted block text-[11.5px]">La tarea se cerró sola cuando respondió</span>
        </span>
      </div>
    </div>
  );
}

/**
 * La posición en la regla (px de su alto de 660) escalada por `--ruler-k`: a poca
 * altura la regla se compacta entera sin mover nada de sitio relativo (film.css).
 * El motor mide por `data-y` / 660, que no cambia.
 */
const ry = (y: number) => `calc(${y}px * var(--ruler-k, 1))`;

export function FollowupScene() {
  return (
    <section id="seguimiento" data-scene="followup" aria-labelledby="seguimiento-h" className="film-scene film-followup">
      <div className="film-followup-morning" data-anim="morning" aria-hidden="true" />
      <div className="film-wrap film-wrap-wide grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,500px)_minmax(0,720px)] lg:justify-between">
        <SceneHead
          id="seguimiento-h"
          eyebrow="Captar"
          strong="Nadie se queda"
          thin="esperando."
          lead="Si una venta no cerró, Axi vuelve en el momento justo. Y se detiene cuando te responden."
        />
        <ByNiche>{(c) => <Timeline c={c} />}</ByNiche>
      </div>
    </section>
  );
}
