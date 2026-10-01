import "../film-pilot.css";

import type { CSSProperties } from "react";
import { IBM_Plex_Mono } from "next/font/google";
import { Sparkles } from "lucide-react";

import {
  FLIGHT_HOLD_PATH,
  FLIGHT_RIVER_PATH,
  FLIGHT_ROUTE_PATH,
  FLIGHT_TOWER,
  FLIGHT_AIRPORT,
  FLIGHT_WORLD,
  FLIGHT_ZONE_PATH,
  PLANE_PATH,
  flightLandscape,
} from "@/modules/landing/domain/film/flight-route";
import {
  PILOT_ANNUNCIATORS,
  PILOT_CONTENT,
  PILOT_COPY,
  PILOT_LOT,
  PILOT_RUN,
  PILOT_STAGES,
  PILOT_STATUS,
  lotCounts,
} from "@/modules/landing/domain/film/pilot-content";
import { PILOT_DIAL_MAX, PILOT_OVERVIEW, capSegments, dial, pilotFrame, type PilotFrame, type PilotMarks } from "@/modules/landing/domain/film/pilot-frame";
import type { Point } from "@/modules/landing/domain/film/route-map";
import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";

/**
 * El piloto automático de captación (plan §19, lienzo aprobado por la dueña el
 * 2026-10-01): una carta de navegación aérea nocturna. El avión despega de la
 * torre del Radar, pasa por los seis pasos del piloto como fijos, rodea el
 * espacio restringido (la política de contacto), espera tu aprobación en un
 * circuito y aterriza en «Demo agendada». A la derecha, la cabina en
 * instrumentos lleva el texto real; el mapa es decorativo.
 *
 * El HTML es el fotograma final (`pilotFrame(1)`): sin motor (movimiento
 * reducido o JS que no llegó) se ve el avión aterrizado, el tablero completo,
 * la ficha del mes y el ajuste que propone Axi. El motor
 * (`engine/pilot-scene.ts`) pinta `pilotFrame(p)` con las mismas funciones.
 *
 * Colores: todo en blanco y grises sobre tinta; el violeta solo en el «Ajuste
 * del piloto», cuando habla Axi.
 */

/** IBM Plex Mono solo en cifras y en la pantalla de ruta (§19.9). Sin precarga: la escena va lejos del pliegue. */
const plex = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], display: "swap", preload: false, variable: "--font-plex-mono" });

const LAND = flightLandscape();
const { approved: APPROVED, skipped: SKIPPED } = lotCounts(PILOT_LOT);
const RUN = { ...PILOT_RUN, approved: APPROVED };
/** El borde útil del fotograma estático se calcula para 1440 y 390 (el motor usa el ancho real). */
// A la derecha, el filo de la cabina a 1440 (x = 1030, 8 px antes) y el de la franja de 390.
const FINAL: PilotFrame = pilotFrame(1, RUN, { left: -520 + 72, right: 1030 - 8 - 520 });
/**
 * El fotograma final en móvil: solo cambia adónde mira la cámara al alejarse
 * (hacia el destino, para que el avión aterrizado quede en la franja). El HTML
 * lleva las dos posiciones como variables y la media query del CSS elige.
 */
const FINAL_M: PilotFrame = pilotFrame(1, RUN, { overview: PILOT_OVERVIEW.mobile, left: -170 + 16, right: 390 - 16 - 170, names: false });
const C = PILOT_COPY.cockpit;

const op = (v: number): CSSProperties => ({ opacity: Number(v.toFixed(3)) });
const tr = (pt: Point) => `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px)`;
/** Una marca en su sitio del fotograma final: escritorio (`--t-d`) y móvil (`--t-m`). */
const at = (pick: (m: PilotMarks) => Point, opacity = 1) =>
  ({ "--t-d": tr(pick(FINAL.marks)), "--t-m": tr(pick(FINAL_M.marks)), opacity: Number(opacity.toFixed(3)) }) as CSSProperties;
const pad = (n: number) => String(n).padStart(2, "0");

/** El bisel de los relojes: 31 marcas en 270°, una mayor cada cinco, en dos trazos. */
const BEZEL = (() => {
  let major = "";
  let minor = "";
  for (let i = 0; i < 31; i++) {
    const a = ((-135 + i * 9) * Math.PI) / 180;
    // Del borde (38) hacia dentro: 7 px las mayores, 4 las menores (y1 = 13 y 10 del lienzo, y2 = 6).
    const from = i % 5 === 0 ? 31 : 34;
    const d = `M${(44 + from * Math.sin(a)).toFixed(2)} ${(44 - from * Math.cos(a)).toFixed(2)}L${(44 + 38 * Math.sin(a)).toFixed(2)} ${(44 - 38 * Math.cos(a)).toFixed(2)}`;
    if (i % 5 === 0) major += d;
    else minor += d;
  }
  return { major, minor };
})();

function PilotMap() {
  const f = FINAL;
  const w = FLIGHT_WORLD;
  return (
    <div className="film-pilot-map" aria-hidden="true">
      <div className="film-pilot-view">
        <div className="film-pilot-plane" data-anim="pilot-plane" style={{ "--plane-d": f.plane, "--plane-m": FINAL_M.plane } as CSSProperties}>
          {/* El paisaje: estático, en su capa; solo lo mueve el plano. */}
          <svg className="film-pilot-land" width={w.w} height={w.h} viewBox={`0 0 ${w.w} ${w.h}`}>
            <defs>
              <pattern id="pilot-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="14" className="film-pilot-hatch" />
              </pattern>
            </defs>
            <path d={LAND.grid} className="film-pilot-grid" />
            <path d={FLIGHT_RIVER_PATH} className="film-pilot-river" />
            <path d={LAND.contours} className="film-pilot-contour" />
            {LAND.lights.map((l) => (
              <path key={`${l.width}-${l.opacity}`} d={l.d} className="film-pilot-lights" style={{ strokeWidth: l.width, strokeOpacity: l.opacity }} />
            ))}
            <g className="film-pilot-tower">
              {FLIGHT_TOWER.rings.map((r, i) => (
                <circle key={r} cx={FLIGHT_TOWER.center.x} cy={FLIGHT_TOWER.center.y} r={r} data-ring={i} />
              ))}
            </g>
            <path d={FLIGHT_ROUTE_PATH} className="film-pilot-airway" />
            <g transform={`translate(${FLIGHT_AIRPORT.x} ${FLIGHT_AIRPORT.y})`} className="film-pilot-airport">
              <circle r="34" />
              <line x1="-60" y1="22" x2="60" y2="-22" />
            </g>
          </svg>
          {/* Lo que cambia con el scroll: la zona, la espera, el barrido y la ruta recorrida. */}
          <svg className="film-pilot-live" width={w.w} height={w.h} viewBox={`0 0 ${w.w} ${w.h}`}>
            <path d={FLIGHT_ZONE_PATH} className="film-pilot-zone" data-anim="pilot-zone" style={op(f.zone)} />
            <line
              x1={FLIGHT_TOWER.center.x}
              y1={FLIGHT_TOWER.center.y}
              x2={FLIGHT_TOWER.center.x}
              y2={FLIGHT_TOWER.center.y - 132}
              className="film-pilot-sweep"
              data-anim="pilot-sweep"
              style={{ transform: `rotate(${f.sweep.toFixed(1)}deg)` }}
            />
            <circle cx={FLIGHT_TOWER.blip.x} cy={FLIGHT_TOWER.blip.y} r="6" className="film-pilot-blip" data-anim="pilot-blip" style={op(f.blip)} />
            <path d={FLIGHT_HOLD_PATH} className="film-pilot-hold" data-anim="pilot-hold" style={op(f.hold)} />
            <path d={FLIGHT_ROUTE_PATH} pathLength={1} className="film-pilot-done-glow" data-anim="pilot-done" style={{ strokeDasharray: `${Math.max(0.0001, f.done).toFixed(4)} 2` }} />
            <path d={FLIGHT_ROUTE_PATH} pathLength={1} className="film-pilot-done" data-anim="pilot-done" style={{ strokeDasharray: `${Math.max(0.0001, f.done).toFixed(4)} 2` }} />
            <circle cx={FLIGHT_AIRPORT.x} cy={FLIGHT_AIRPORT.y} r="10" className="film-pilot-apt" />
          </svg>
        </div>
      </div>

      {/* El velo: oscurece el mapa detrás del titular y de la cabina, por DEBAJO de las marcas. */}
      <div className="film-pilot-veil" />

      {/* Las marcas: en el foco, movidas por `project` con la misma cámara que el plano. */}
      <div className="film-pilot-anchor">
        {f.marks.fixes.map((pt, i) => (
          <div key={i} className="film-pilot-mark film-pilot-fix-mark" data-anim="pilot-fix" data-lit={f.lit[i] ? "" : undefined}
            style={{ ...at((m) => m.fixes[i]), opacity: undefined, "--o-d": (f.fixesIn * f.fixEdge[i]).toFixed(3), "--o-m": (FINAL_M.fixesIn * FINAL_M.fixEdge[i]).toFixed(3) } as CSSProperties}
          >
            <svg width="16" height="14" viewBox="0 0 16 14" className="film-pilot-fix">
              <path d="M8 1 15 13H1Z" />
            </svg>
            <span className="film-pilot-tag film-pilot-fix-tag">
              {i + 1}
              <span className="film-pilot-fix-name"> · {PILOT_COPY.steps[i]}</span>
            </span>
          </div>
        ))}
        <div className="film-pilot-mark film-pilot-desk" data-anim="pilot-tower" style={at((m) => m.tower)}>
          <span className="film-pilot-tag film-pilot-tower-tag">{PILOT_COPY.tower}</span>
        </div>
        <div className="film-pilot-mark film-pilot-desk" data-anim="pilot-airport" style={at((m) => m.airport)}>
          <span className="film-pilot-tag film-pilot-apt-tag" data-anim="pilot-airport-label" style={op(f.airportLabel)}>
            {PILOT_COPY.destination}
          </span>
        </div>
        <div
          className="film-pilot-mark film-pilot-zone-mark"
          data-anim="pilot-zone-mark"
          style={{ ...at((m) => m.zone), opacity: undefined, "--o-d": FINAL.zoneBox.toFixed(3), "--o-m": FINAL_M.zoneTag.toFixed(3) } as CSSProperties}
        >
          <span className="film-pilot-zone-box film-pilot-desk">
            <span className="film-pilot-tag-k">{PILOT_COPY.zone.title}</span>
            <span className="film-pilot-zone-near" data-anim="pilot-zone-near" style={op(f.zoneNear)}>
              {PILOT_COPY.zone.near}
            </span>
            <span className="film-pilot-zone-passed" data-anim="pilot-zone-passed" style={op(f.zonePassed)}>
              {PILOT_COPY.zone.passed}
            </span>
          </span>
          <span className="film-pilot-tag film-pilot-zone-tag film-pilot-mob">{PILOT_COPY.zone.title}</span>
        </div>
        <div className="film-pilot-mark film-pilot-desk" data-anim="pilot-sources" style={at((m) => m.sources)}>
          <span className="film-pilot-sources" data-anim="pilot-sources-list" style={op(f.sourcesIn)}>
            {PILOT_COPY.sources.map((s) => (
              <span key={s} className="film-pilot-source">
                <i />
                {s}
              </span>
            ))}
          </span>
        </div>
        <div className="film-pilot-mark film-pilot-desk" data-anim="pilot-people" style={at((m) => m.people)}>
          <span className="film-pilot-people" data-anim="pilot-people-card" style={op(f.people)}>
            <span className="film-pilot-guide" />
            <ByNiche as="span">
              {(_, n) => {
                const d = PILOT_CONTENT[n].decisor;
                return (
                  <span className="film-pilot-person">
                    <span className="film-pilot-person-k">{PILOT_COPY.people.title}</span>
                    <span className="film-pilot-person-roles">{PILOT_COPY.people.roles}</span>
                    <span className="film-pilot-person-row">
                      <span className="film-pilot-person-av">{d.initials}</span>
                      <span className="flex flex-col">
                        <b>{d.name}</b>
                        <span className="film-pilot-person-role">{d.role}</span>
                      </span>
                    </span>
                  </span>
                );
              }}
            </ByNiche>
          </span>
        </div>
        <div className="film-pilot-mark film-pilot-desk" data-anim="pilot-hold-mark" style={at((m) => m.holdLabel)}>
          <span className="film-pilot-tag film-pilot-hold-tag" data-anim="pilot-hold-label" style={op(f.holdLabel)}>
            {PILOT_COPY.hold}
          </span>
        </div>
        <div className="film-pilot-mark film-pilot-desk" data-anim="pilot-bubble" style={at((m) => m.bubble)}>
          <span className="film-pilot-bubble" data-anim="pilot-bubble-box" style={op(f.bubble)}>
            <span className="film-pilot-tag-k">{PILOT_COPY.bubble.title}</span>
            <span className="film-pilot-bubble-text">{PILOT_COPY.bubble.text}</span>
          </span>
        </div>
        <div className="film-pilot-mark" data-anim="pilot-craft" style={at((m) => m.plane, f.planeIn)}>
          <svg viewBox="0 0 24 24" className="film-pilot-craft" data-anim="pilot-heading" style={{ "--r-d": `rotate(${f.heading.toFixed(1)}deg)`, "--r-m": `rotate(${FINAL_M.heading.toFixed(1)}deg)` } as CSSProperties}>
            <path d={PLANE_PATH} />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Dials() {
  const f = FINAL;
  const values = [f.found, f.qualified, f.contacted];
  return (
    <div className="film-pilot-dials film-pilot-desk">
      {C.dials.map((label, i) => {
        const d = dial(values[i], PILOT_DIAL_MAX);
        return (
          <div key={label} className="film-pilot-dial">
            <span className="film-pilot-dial-face">
              <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
                <path d={BEZEL.minor} className="film-pilot-bezel" />
                <path d={BEZEL.major} className="film-pilot-bezel" data-major="" />
                <circle cx="44" cy="44" r="31" transform="rotate(135 44 44)" className="film-pilot-arc-track" pathLength={1} />
                <circle cx="44" cy="44" r="31" transform="rotate(135 44 44)" className="film-pilot-arc" pathLength={1} data-anim="pilot-arc" style={{ strokeDasharray: `${Math.max(0.0001, d.arc).toFixed(4)} 1` }} />
                <line x1="44" y1="44" x2="44" y2="17" className="film-pilot-needle" data-anim="pilot-needle" style={{ transform: `rotate(${d.needle.toFixed(1)}deg)` }} />
                <circle cx="44" cy="44" r="3" className="film-pilot-hub" />
              </svg>
              <b className="film-pilot-dial-v" data-anim="pilot-dial-v">
                {pad(values[i])}
              </b>
            </span>
            <span className="film-pilot-k">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Board() {
  const f = FINAL;
  return (
    <div className="film-pilot-board">
      <span className="film-pilot-k film-pilot-desk">{C.board}</span>
      <ByNiche>
        {(_, n) => (
          <ul className="film-pilot-rows" aria-label={`${C.board} · ${PILOT_CONTENT[n].target}`}>
            {PILOT_CONTENT[n].accounts.map((name, i) => {
              const row = f.board[i];
              return (
                <li key={name} className="film-pilot-row" data-anim="pilot-row" data-skipped={!PILOT_LOT[i] && f.skippedDim ? "" : undefined}>
                  <span className="film-pilot-row-name">{name}</span>
                  <span className="film-pilot-chip" data-anim="pilot-chip" data-stage={row.stage ?? undefined}>
                    {row.stage ? PILOT_STAGES[row.stage] : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </ByNiche>
    </div>
  );
}

function Phases() {
  const f = FINAL;
  return (
    <div className="film-pilot-phases film-pilot-desk">
      <div className="film-pilot-phase" data-phase-of="log">
        <span className="film-pilot-k">{C.log}</span>
        {PILOT_COPY.log.map((line, i) => (
          <span key={line} className="film-pilot-log" data-anim="pilot-log" style={op(f.log[i])}>
            {line}
          </span>
        ))}
      </div>
      <div className="film-pilot-phase film-pilot-lot" data-phase-of="lot">
        <span className="film-pilot-lot-title">{C.lotTitle}</span>
        <ByNiche>
          {(_, n) => (
            <ul className="film-pilot-lot-list">
              {PILOT_CONTENT[n].accounts.map((name, i) => (
                <li key={name} data-on={PILOT_LOT[i] ? "" : undefined}>
                  <span className="film-pilot-box" aria-hidden="true" />
                  {C.approveOne(name)}
                  <span className="sr-only">, {PILOT_LOT[i] ? C.boxOn : C.boxOff}</span>
                </li>
              ))}
            </ul>
          )}
        </ByNiche>
        <span className="film-pilot-lot-actions">
          <span className="film-pilot-approve" data-anim="pilot-approve" style={{ transform: `scale(${f.pressScale.toFixed(3)})` }}>
            {C.approve(APPROVED)}
          </span>
          <span className="film-pilot-dim">{C.skipped(SKIPPED)}</span>
        </span>
        <span className="film-pilot-runnow">
          <span className="film-pilot-runnow-k">{C.runNow}</span> {C.runNowWhy}
        </span>
      </div>
      <div className="film-pilot-phase" data-phase-of="sent">
        <span className="film-pilot-sent">{C.sent(APPROVED)}</span>
        <span className="film-pilot-channels">
          {C.channels.map((c, i) => (
            <span key={c} className="film-pilot-channel" data-anim="pilot-channel" data-on={i < f.channels ? "" : undefined}>
              {c}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

function Cockpit() {
  const f = FINAL;
  const lit = capSegments(f.contacted, RUN.cap);
  // `data-pill-avoid`: en móvil la píldora del nicho se aparta mientras la cabina ocupa la franja de abajo.
  return (
    <aside className="film-pilot-cockpit" data-anim="head" data-pill-avoid="" aria-label={C.title} style={op(f.panel)}>
      <div className="film-pilot-cockpit-top film-pilot-desk">
        <span className="film-pilot-cockpit-title">{C.title}</span>
        <span className="film-pilot-mode" role="group" aria-label={C.modeLabel}>
          <span aria-current="true">{C.modes[0]}</span>
          <span>{C.modes[1]}</span>
        </span>
      </div>
      <p className="film-pilot-mode-note film-pilot-desk">{C.modeNote}</p>

      <Dials />

      <div className="film-pilot-screen">
        <span className="flex flex-col gap-0.5">
          <span className="film-pilot-screen-k" data-anim="pilot-step">
            {C.step(f.step + 1, PILOT_COPY.steps.length)}
          </span>
          <span className="film-pilot-screen-v" data-anim="pilot-step-name">
            {PILOT_COPY.steps[f.step]}
          </span>
        </span>
        <span className="film-pilot-screen-next film-pilot-desk">
          <span className="film-pilot-screen-k">{C.next}</span>
          <span className="film-pilot-screen-n" data-anim="pilot-next">
            {f.next === null ? PILOT_COPY.destination : PILOT_COPY.steps[f.next]}
          </span>
        </span>
        <span className="film-pilot-pill film-pilot-mob" data-anim="pilot-status">
          {PILOT_STATUS[f.status]}
        </span>
      </div>

      <div className="film-pilot-annun film-pilot-desk" role="status">
        {PILOT_ANNUNCIATORS.map((s) => (
          <span key={s} data-of={s}>
            {PILOT_STATUS[s]}
          </span>
        ))}
      </div>

      <div className="film-pilot-cap">
        <span className="film-pilot-cap-top">
          <span className="film-pilot-k">{C.cap}</span>
          <span className="film-pilot-mono">
            <span data-anim="pilot-contacted">{f.contacted}</span>/{RUN.cap} {C.capUnit}
          </span>
        </span>
        <span className="film-pilot-fuel" aria-hidden="true">
          {Array.from({ length: 20 }, (_, i) => (
            <i key={i} data-anim="pilot-fuel" data-on={i < lit ? "" : undefined} />
          ))}
        </span>
        <span className="film-pilot-fuel-scale film-pilot-desk" aria-hidden="true">
          <span>0</span>
          <span>{RUN.cap / 2}</span>
          <span>{RUN.cap}</span>
        </span>
      </div>

      <Board />
      <Phases />
      <span className="film-pilot-approve film-pilot-approve-mob film-pilot-mob" aria-hidden="true">
        {C.approve(APPROVED)}
      </span>
      <span className="film-pilot-foot film-pilot-desk">{C.foot}</span>
    </aside>
  );
}

function Results() {
  const f = FINAL;
  const R = PILOT_COPY.results;
  return (
    <div className="film-pilot-results" data-anim="pilot-results" style={op(f.results)}>
      <div className="film-pilot-results-top">
        <span className="film-pilot-results-title">{R.title}</span>
        <span className="film-pilot-sample">{R.sample}</span>
      </div>
      <span className="film-pilot-k">{R.funnel}</span>
      <ByNiche>
        {(_, n) => {
          const funnel = PILOT_CONTENT[n].funnel;
          return (
            <ul className="film-pilot-funnel">
              {funnel.map((v, i) => (
                <li key={R.stages[i]}>
                  <span className="film-pilot-funnel-l">{R.stages[i]}</span>
                  <span className="film-pilot-funnel-bar">
                    <i data-anim="pilot-funnel" data-share={(v / funnel[0]).toFixed(4)} style={{ transform: `scaleX(${((v / funnel[0]) * f.funnel).toFixed(4)})` }} />
                  </span>
                  <b>{v}</b>
                </li>
              ))}
            </ul>
          );
        }}
      </ByNiche>
      <div className="film-pilot-tune" data-anim="pilot-tune" style={op(f.tune)}>
        <span className="film-pilot-tune-title">
          <Sparkles className="size-[15px]" aria-hidden="true" />
          {R.tuneTitle}
        </span>
        <span className="film-pilot-tune-note">{R.tuneNote}</span>
        <span className="film-pilot-tune-what">
          <span className="film-pilot-dim">{R.tuneChange}</span> {R.tuneWhat}
        </span>
      </div>
    </div>
  );
}

export function PilotScene() {
  const f = FINAL;
  return (
    <section
      id="piloto"
      data-scene="pilot"
      aria-labelledby="piloto-h"
      className={`film-scene film-pilot ${plex.variable}`}
      data-phase={f.phase}
      data-status={f.status}
      data-landed={f.airportLit ? "" : undefined}
    >
      {/* En escritorio no pinta caja (`display: contents`); en móvil, con el motor,
          es la franja que se queda pegada mientras se lee el vuelo (film-pilot.css). */}
      <div className="film-pilot-stick" data-anim="pilot-stick">
      <PilotMap />
      <div className="film-pilot-layout">
        {/* data-anim="head": entra con el scroll de antes del pin (sceneTimeline). */}
        <div className="film-pilot-left" data-anim="head">
          {/* En el HTML, a pleno: el motor lo atenúa al final mientras sube la ficha. */}
          <div className="film-pilot-head" data-anim="pilot-head">
            <p className="film-eyebrow film-dim">{PILOT_COPY.eyebrow}</p>
            <h2 id="piloto-h" className="film-h film-pilot-title">
              <span className="t">{PILOT_COPY.title[0]}</span>
              <br />
              {PILOT_COPY.title[1]}
            </h2>
            <p className="film-lead film-pilot-lead">{PILOT_COPY.lead}</p>
          </div>
          <Results />
          <p className="film-pilot-principle" data-anim="pilot-principle">
            {PILOT_COPY.principle}
          </p>
        </div>
        <Cockpit />
      </div>
      </div>
    </section>
  );
}
