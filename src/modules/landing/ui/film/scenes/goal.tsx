import "../film-tanda4.css";

import type { CSSProperties } from "react";
import { Flag } from "lucide-react";

import { GOAL_COPY } from "@/modules/landing/domain/film/goal-content";
import { goalFrame, type GoalFrame } from "@/modules/landing/domain/film/goal-camera";
import {
  GOAL_RIVER_PATH,
  GOAL_ROUTE_PATH,
  GOAL_WORLD,
  goalCityBlocks,
  goalSlicePath,
  type Point,
} from "@/modules/landing/domain/film/route-map";
import { ROUTE_FRACTIONS, formatMillions, formatPercent, formatPesos, routeScenario } from "@/modules/landing/domain/film/route-scenario";
import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";

/**
 * La meta (plan §16.1, lienzo «Landing · La meta»): una navegación nocturna en
 * tinta hacia la meta del mes. Una ciudad en rejilla, la ruta por sus calles y
 * una cámara en 3D que baja sobre la ciudad, sigue al coche y se aleja para
 * mostrar la llegada; Axi propone otra ruta (violeta) y, al aprobarla, la
 * llegada sube del 82 % al 91 %.
 *
 * El HTML es el fotograma final (`goalFrame(1)`): sin motor (movimiento
 * reducido o JS que no llegó) se ve la ruta de Axi ya aprobada. El motor
 * (`engine/goal-scene.ts`) pinta `goalFrame(p)` con las mismas funciones.
 *
 * Colores: el coral solo en el coche; el violeta solo mientras Axi propone;
 * todo lo demás, en tinta.
 */

const BLOCKS = goalCityBlocks();
const SLOW_PATH = goalSlicePath(ROUTE_FRACTIONS.done, ROUTE_FRACTIONS.expected);
const PROJECTION_PATH = goalSlicePath(ROUTE_FRACTIONS.done, ROUTE_FRACTIONS.projected);
const FINAL: GoalFrame = goalFrame(1);

const op = (v: number): CSSProperties => ({ opacity: Number(v.toFixed(3)) });
const at = (pt: Point, opacity: number): CSSProperties => ({
  transform: `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px)`,
  opacity: Number(opacity.toFixed(3)),
});
/** «Luego: envía 5 cotizaciones · agenda 3 entregas»: las dos indicaciones que siguen, en minúscula. */
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function GoalMap() {
  const f = FINAL;
  return (
    <div className="film-goal-map" aria-hidden="true">
      <div className="film-goal-view">
        <div className="film-goal-plane" data-anim="goal-plane" style={{ transform: f.plane }}>
          {/* La ciudad: estática, nunca se repinta (solo la mueve el plano). */}
          <svg className="film-goal-city" width={GOAL_WORLD.w} height={GOAL_WORLD.h} viewBox={`0 0 ${GOAL_WORLD.w} ${GOAL_WORLD.h}`}>
            <defs>
              <radialGradient id="goal-fade" cx="50%" cy="50%" r="60%">
                <stop offset=".55" stopColor="#0a0a0b" stopOpacity="0" />
                <stop offset="1" stopColor="#0a0a0b" />
              </radialGradient>
            </defs>
            <path d={GOAL_RIVER_PATH} fill="none" stroke="rgb(255 255 255 / .035)" strokeWidth={90} />
            {BLOCKS.map((b) => (
              <rect
                key={`${b.x}-${b.y}`}
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={8}
                fill={b.park ? "rgb(255 255 255 / .045)" : "rgb(255 255 255 / .022)"}
                stroke={b.park ? "rgb(255 255 255 / .09)" : "rgb(255 255 255 / .055)"}
              />
            ))}
            <rect width={GOAL_WORLD.w} height={GOAL_WORLD.h} fill="url(#goal-fade)" />
            {/* El carril y el plan punteado: tampoco cambian. */}
            <path d={GOAL_ROUTE_PATH} className="film-goal-lane" />
            <path d={GOAL_ROUTE_PATH} className="film-goal-plan" />
          </svg>
          {/* La ruta: cada capa es su `<path>` y avanza con `stroke-dasharray`. */}
          <svg className="film-goal-route" width={GOAL_WORLD.w} height={GOAL_WORLD.h} viewBox={`0 0 ${GOAL_WORLD.w} ${GOAL_WORLD.h}`}>
            <defs>
              <mask id="goal-slow-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={GOAL_WORLD.w} height={GOAL_WORLD.h}>
                <path d={SLOW_PATH} pathLength={1} className="film-goal-reveal" data-anim="goal-slow" style={{ strokeDasharray: f.dash.slow }} />
              </mask>
              <mask id="goal-projection-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={GOAL_WORLD.w} height={GOAL_WORLD.h}>
                <path d={PROJECTION_PATH} pathLength={1} className="film-goal-reveal" data-anim="goal-projection" style={{ strokeDasharray: f.dash.projection }} />
              </mask>
            </defs>
            <path d={GOAL_ROUTE_PATH} pathLength={1} className="film-goal-axi-glow" data-anim="goal-axi-glow" style={{ strokeDasharray: f.dash.axi, opacity: f.axiGlow * f.axiLine }} />
            <path d={GOAL_ROUTE_PATH} pathLength={1} className="film-goal-axi" data-anim="goal-axi" style={{ strokeDasharray: f.dash.axi, opacity: f.axiLine }} />
            <path d={PROJECTION_PATH} className="film-goal-projection" mask="url(#goal-projection-mask)" data-anim="goal-projection-line" style={op(f.projection)} />
            <path d={SLOW_PATH} className="film-goal-slow" mask="url(#goal-slow-mask)" />
            <path d={GOAL_ROUTE_PATH} pathLength={1} className="film-goal-done-glow" data-anim="goal-done" style={{ strokeDasharray: f.dash.done, opacity: f.doneLine }} />
            <path d={GOAL_ROUTE_PATH} pathLength={1} className="film-goal-done" data-anim="goal-done" style={{ strokeDasharray: f.dash.done, opacity: f.doneLine }} />
          </svg>
        </div>
      </div>

      {/* El velo que oscurece la ciudad detrás del titular y del panel: por DEBAJO de las marcas. */}
      <div className="film-goal-veil" />

      {/* Las marcas: en el foco, movidas por `project` con la misma cámara que el plano. */}
      <div className="film-goal-anchor">
        <div className="film-goal-mark max-lg:hidden" data-anim="goal-start" style={at(f.marks.start, f.start)}>
          <span className="film-goal-start">{GOAL_COPY.start}</span>
        </div>
        <ByNiche>
          {(c) => {
            const s = routeScenario(c.route);
            return (
              <>
                <div className="film-goal-mark max-lg:hidden" data-anim="goal-should" style={at(f.marks.should, f.should)}>
                  <span className="film-goal-should-dot" />
                  <span className="film-goal-should-label">{GOAL_COPY.slow(formatMillions(s.behind))}</span>
                </div>
                <div className="film-goal-mark" data-anim="goal-ring" style={at(f.marks.ring, f.ring)}>
                  <span className="film-goal-ring" />
                  <span className="film-goal-ring-label">
                    <b data-anim="goal-arrive-pct">{formatPercent(f.arrive)}</b>
                    <span className="max-lg:hidden">
                      {" · "}
                      <span className="film-goal-when-propose">{GOAL_COPY.arriveNow}</span>
                      <span className="film-goal-when-approved">{GOAL_COPY.arriveAxi}</span>{" "}
                      <span data-anim="goal-arrive-value" data-goal={s.goal}>
                        {formatMillions(s.goal * f.arrive)}
                      </span>
                    </span>
                    <span className="lg:hidden"> · {GOAL_COPY.arriveShort}</span>
                  </span>
                </div>
                <div className="film-goal-mark" data-anim="goal-flag" style={at(f.marks.flag, f.flag)}>
                  <span className="film-goal-flag">
                    <Flag className="size-[17px]" strokeWidth={2.2} />
                  </span>
                  <span className="film-goal-flag-label max-lg:hidden">{GOAL_COPY.flag(formatMillions(s.goal))}</span>
                </div>
                <div className="film-goal-mark film-goal-car-mark" data-anim="goal-car" style={at(f.marks.car, f.carMark)}>
                  <span className="film-goal-pulse" data-anim="goal-pulse" style={{ transform: `scale(${f.pulse.toFixed(3)})` }} />
                  <span className="film-goal-car" data-anim="goal-heading" style={{ transform: `rotate(${f.carHeading.toFixed(1)}deg)` }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff">
                      <path d="M12 2 20 21 12 17 4 21z" />
                    </svg>
                  </span>
                  <span className="film-goal-here" data-anim="goal-here" style={op(f.here)}>
                    <span className="film-goal-here-k">{GOAL_COPY.here}</span>
                    <span className="film-goal-here-v" data-anim="goal-here-value" data-goal={s.goal}>
                      {formatMillions(s.reached)} · {formatPercent(s.done)}
                    </span>
                  </span>
                  <span className="film-goal-recalc" data-anim="goal-recalc" style={op(f.recalc)}>
                    <span className="film-goal-recalc-dot" />
                    <span className="film-goal-when-propose">{GOAL_COPY.recalc}</span>
                    <span className="film-goal-when-approved">{GOAL_COPY.recalcDone}</span>
                  </span>
                </div>
              </>
            );
          }}
        </ByNiche>
      </div>
    </div>
  );
}

function GoalPanel() {
  const f = FINAL;
  return (
    <ByNiche>
      {(c) => {
        const s = routeScenario(c.route);
        const [today, next1, next2] = c.route.steps;
        return (
          // data-anim="head": entra con el scroll de antes del pin (sceneTimeline).
          <aside data-anim="head" className="film-goal-panel">
            <div className="film-goal-panel-top">
              <div>
                <p className="film-goal-dim text-xs">{GOAL_COPY.destination}</p>
                <p className="film-goal-sell">{GOAL_COPY.sell(formatPesos(s.goal))}</p>
              </div>
              <span className="film-goal-slow-chip" data-anim="goal-slow-chip" style={op(f.slowChip)}>
                {GOAL_COPY.slowChip}
              </span>
            </div>

            <div className="film-goal-turn">
              <span className="film-goal-turn-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f5f5f7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 20V9a4 4 0 0 1 4-4h7M16 1l4 4-4 4" />
                </svg>
              </span>
              <span className="flex flex-col">
                <span className="film-goal-turn-title">{today}</span>
                <span className="film-goal-turn-sub">{GOAL_COPY.remaining(formatMillions(s.remaining), s.businessDaysLeft)}</span>
              </span>
            </div>
            <p className="film-goal-then max-lg:hidden">
              {GOAL_COPY.then} {lower(next1)} · {lower(next2)}
            </p>

            <div>
              <div className="film-goal-bar">
                <div className="film-goal-bar-fill" data-anim="goal-bar" style={{ transform: `scaleX(${f.car.toFixed(4)})` }} />
                <div
                  className="film-goal-bar-slow"
                  style={{ left: `${(ROUTE_FRACTIONS.done * 100).toFixed(2)}%`, width: `${((ROUTE_FRACTIONS.expected - ROUTE_FRACTIONS.done) * 100).toFixed(2)}%` }}
                >
                  <div data-anim="goal-bar-slow" style={{ transform: `scaleX(${((f.barSlow / (ROUTE_FRACTIONS.expected - ROUTE_FRACTIONS.done)) || 0).toFixed(4)})` }} />
                </div>
                <div className="film-goal-bar-track" data-anim="goal-bar-ring" style={{ transform: `translateX(${(f.arrive * 100).toFixed(2)}%)`, opacity: f.ring }}>
                  <span className="film-goal-bar-ring" />
                </div>
              </div>
              <div className="film-goal-bar-legend max-lg:hidden">
                <span>
                  {GOAL_COPY.reached}{" "}
                  <b data-anim="goal-reached" data-goal={s.goal}>
                    {formatMillions(s.reached)}
                  </b>
                </span>
                <span>
                  {GOAL_COPY.eta} <b data-anim="goal-arrive-pct">{formatPercent(f.arrive)}</b>
                </span>
              </div>
            </div>

            <div className="film-goal-rule max-lg:hidden" />
            <p className="film-goal-routes max-lg:hidden">{GOAL_COPY.routes}</p>
            <div className="film-goal-route-now max-lg:hidden" data-anim="goal-route-now" style={op(f.routeNow)}>
              <span>{GOAL_COPY.routeNow}</span>
              <b>{formatPercent(s.projected)}</b>
            </div>
            <div className="film-goal-route-axi" data-anim="goal-route-axi" style={op(f.routeAxi)}>
              <span className="flex justify-between gap-3">
                <span>{c.route.axiRoute}</span>
                <b>{formatPercent(s.projectedWithRoute)}</b>
              </span>
              <span className="film-goal-approve" data-anim="goal-approve" style={{ transform: `scale(${f.button})` }}>
                <span className="film-goal-when-propose">{GOAL_COPY.approve}</span>
                <span className="film-goal-when-approved">{GOAL_COPY.approved}</span>
              </span>
            </div>
            <p className="film-goal-note max-lg:hidden">{GOAL_COPY.note}</p>
          </aside>
        );
      }}
    </ByNiche>
  );
}

export function GoalScene() {
  return (
    <section
      id="crecer"
      data-scene="goal"
      data-chapter="Crecer"
      aria-labelledby="meta-h"
      className="film-scene film-goal"
      data-approved={FINAL.approved ? "" : undefined}
    >
      <GoalMap />
      <div className="film-goal-layout">
        <div className="film-goal-head" data-anim="head">
          <p className="film-eyebrow film-goal-dim mb-[18px]">{GOAL_COPY.eyebrow}</p>
          <h2 id="meta-h" className="film-h film-goal-title">
            {GOAL_COPY.title}
            <br />
            <span className="t">{GOAL_COPY.titleThin}</span>
          </h2>
          <p className="film-lead film-goal-lead max-lg:hidden">{GOAL_COPY.lead}</p>
        </div>
        <GoalPanel />
      </div>
    </section>
  );
}
