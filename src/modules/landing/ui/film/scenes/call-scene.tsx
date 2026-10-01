import "../film-call.css";

import type { CSSProperties } from "react";

import {
  CALL_COPY,
  CALL_NOTES,
  CALL_PEAKS,
  CALL_PHRASES,
  CALL_STAGES,
  CALL_TOTAL,
  CALL_TRACKS,
  CALL_WORDS,
  callClock,
} from "@/modules/landing/domain/film/call-audio";
import { CallPlayer } from "@/modules/landing/ui/film/parts/CallPlayer";

/**
 * Escucha la llamada (plan §20, lienzo v4 aprobado el 2026-10-01). La esfera es
 * el botón: suena una entrante de ejemplo y la escena escucha la voz.
 *
 * La escena entera la pinta el servidor —la esfera, las órbitas 3D, la corona,
 * la onda real, las dos pistas de subtítulos con el segundo de cada palabra
 * (`data-at`), las notas y las etapas— y el navegador solo recibe el
 * reproductor (`parts/CallPlayer.tsx`), que mueve atributos y variables CSS.
 *
 * Sin JS (o antes de tocar la esfera) el HTML es el fotograma final: etapas y
 * notas completas, la onda tenue y la invitación a escuchar.
 */

/** Las órbitas (graves, medios, agudos): radio, giro en pantalla, inclinación, duración, desfase, color, punto, sentido. */
const RINGS = [
  { r: 150, z: -16, x: 72, d: 15, dl: -2, color: "#E65759", dot: "#FF7A6E", rev: false, sw: 1.8 },
  { r: 178, z: 22, x: 76, d: 21, dl: -9, color: "#9A4FFF", dot: "#B48BFF", rev: true, sw: 1.5 },
  { r: 206, z: -4, x: 80, d: 29, dl: -17, color: "#FFC04D", dot: "#FFD580", rev: false, sw: 1.2 },
] as const;

/** La onda real como dos trazos (cliente y Axi) sobre un viewBox de 1000 × 36. */
const WAVE = (() => {
  const bars = [...CALL_PEAKS[0].map((v) => [v, 0] as const), ...CALL_PEAKS[1].map((v) => [v, 1] as const)];
  const d: [string, string] = ["", ""];
  bars.forEach(([v, who], i) => {
    const x = ((i + 0.5) * 1000) / bars.length;
    const h = 1 + v * 15;
    d[who] += `M${x.toFixed(1)} ${(18 - h).toFixed(1)}V${(18 + h).toFixed(1)}`;
  });
  return { client: d[0], axi: d[1], axiFrom: (CALL_PEAKS[0].length / bars.length) * 1000 };
})();

const GLYPH_PLAY = "M9.2 5.9v12.2c0 .5.5.8.9.5l9.6-6.1a.6.6 0 0 0 0-1l-9.6-6.1a.6.6 0 0 0-.9.5z";
const pct = (at: number) => `${((at / CALL_TOTAL) * 100).toFixed(2)}%`;

/** El isotipo de Axi, para el avatar de su voz. */
function Mark() {
  return (
    <svg width="13" height="13" viewBox="90 115 330 270">
      <path fillRule="evenodd" d="M228.574 374.558C305.107 374.558 335.082 305.843 357.987 250.872C344.244 183.302 305.107 127.186 228.574 127.186C152.042 127.186 90 182.562 90 250.872C90 319.182 152.042 374.558 228.574 374.558ZM222.848 303.553C253.208 303.553 277.82 279.454 277.82 249.726C277.82 219.999 253.208 195.9 222.848 195.9C192.488 195.9 167.876 219.999 167.876 249.726C167.876 279.454 192.488 303.553 222.848 303.553Z" fill="#E65759" />
      <path d="M270.948 257.743C300.724 150.09 349.97 127.185 408.377 127.186C383.182 159.252 341.953 337.444 292.708 360.815C238.652 386.468 181.619 371.122 161.005 358.524C196.507 366.541 247.824 341.346 270.948 257.743Z" fill="#9A4FFF" />
      <path d="M355.696 225.676C373.104 295.307 398.833 353.943 409.522 374.558C309.886 374.558 280.11 290.955 266.367 225.676C253.589 164.978 191.163 140.928 166.731 139.783C186.887 125.124 225.804 121.086 268.658 132.912C311.511 144.737 341.667 169.559 355.696 225.676Z" fill="#FFC04D" />
    </svg>
  );
}

export function CallScene() {
  const id = "call";
  return (
    <section id="llamada" data-scene="call" aria-labelledby="llamada-h" className="film-scene film-call">
      <div className="film-call-fields" aria-hidden="true">
        <span className="film-call-fld film-call-fld-brand" />
        <span className="film-call-fld film-call-fld-silver" />
      </div>

      <div className="film-call-layout">
        <div className="film-sell-head film-call-head" data-anim="head">
          <p className="film-eyebrow film-sell-dim">{CALL_COPY.eyebrow}</p>
          <h2 id="llamada-h" className="film-h film-sell-title">
            {CALL_COPY.title}
            <br />
            <span className="t">{CALL_COPY.titleThin}</span>
          </h2>
          <p className="film-lead film-sell-lead">{CALL_COPY.lead}</p>
        </div>

        <div className="film-call-stagebox" data-anim="call-orb">
          <div className="film-call-stage">
            <span className="film-call-horizon" aria-hidden="true" />
            <span className="film-call-shadow" aria-hidden="true" />
            <span className="film-call-reflect" aria-hidden="true" />
            <span className="film-call-ripples" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="film-call-bloom film-call-bl-a" aria-hidden="true">
              <i />
            </span>
            <span className="film-call-bloom film-call-bl-s" aria-hidden="true">
              <i />
            </span>
            {/* La corona la dibuja CallPlayer: 64 marcas, espectro en espejo (graves arriba, agudos abajo). */}
            <canvas className="film-call-corona" width={560} height={560} aria-hidden="true" />
            <div className="film-call-gyro">
              {(["back"] as ("back" | "front")[]).flatMap((half) =>
                RINGS.map((r, i) => {
                  // Algo más abierta que cos(x): la perspectiva desde arriba del lienzo abría las elipses.
                  const k = (Math.cos((r.x * Math.PI) / 180) * 1.45).toFixed(4);
                  const box = r.r + 20;
                  const timing = { "--d": `${r.d}s`, "--dl": `${r.dl}s` } as CSSProperties;
                  return (
                    <div key={`${half}${i}`} className="film-call-orbit" aria-hidden="true" style={{ transform: `rotate(${r.z}deg)` }}>
                      {/* Media órbita: la de atrás va bajo la esfera; la de delante, encima. */}
                      <div className="film-call-half" style={{ left: -box, top: half === "back" ? -box : 0, width: 2 * box, height: box }}>
                        <div style={{ transform: `translate(${box}px, ${half === "back" ? box : 0}px) scaleY(${k})` }}>
                          <div className={r.rev ? "film-call-spin film-call-rev" : "film-call-spin"} style={timing}>
                            <i className="film-call-arc" style={{ "--r": `${r.r}px`, "--col": r.color, "--dot": r.dot, "--sw": `${r.sw}px` } as CSSProperties} />
                            <div style={{ transform: `translateX(${r.r}px)` }}>
                              <div className="film-call-counter" style={timing}>
                                <div style={{ transform: `scaleY(${(1 / Number(k)).toFixed(4)})` }}>
                                  <i className="film-call-sat" style={{ "--dc": r.dot } as CSSProperties} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }),
              )}
              <button
                type="button"
                className="film-call-pearl"
                aria-label={CALL_COPY.play}
                aria-pressed="false"
              >
                <span className="film-call-core film-call-brand">
                  <span />
                </span>
                <span className="film-call-core film-call-silver">
                  <span />
                </span>
                <span className="film-call-vol" />
                <span className="film-call-spec" />
                <svg className="film-call-glyph" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={GLYPH_PLAY} />
                </svg>
              </button>
              {(["front"] as ("back" | "front")[]).flatMap((half) =>
                RINGS.map((r, i) => {
                  // Algo más abierta que cos(x): la perspectiva desde arriba del lienzo abría las elipses.
                  const k = (Math.cos((r.x * Math.PI) / 180) * 1.45).toFixed(4);
                  const box = r.r + 20;
                  const timing = { "--d": `${r.d}s`, "--dl": `${r.dl}s` } as CSSProperties;
                  return (
                    <div key={`${half}${i}`} className="film-call-orbit" aria-hidden="true" style={{ transform: `rotate(${r.z}deg)` }}>
                      {/* Media órbita: la de atrás va bajo la esfera; la de delante, encima. */}
                      <div className="film-call-half" style={{ left: -box, top: half === "back" ? -box : 0, width: 2 * box, height: box }}>
                        <div style={{ transform: `translate(${box}px, ${half === "back" ? box : 0}px) scaleY(${k})` }}>
                          <div className={r.rev ? "film-call-spin film-call-rev" : "film-call-spin"} style={timing}>
                            <i className="film-call-arc" style={{ "--r": `${r.r}px`, "--col": r.color, "--dot": r.dot, "--sw": `${r.sw}px` } as CSSProperties} />
                            <div style={{ transform: `translateX(${r.r}px)` }}>
                              <div className="film-call-counter" style={timing}>
                                <div style={{ transform: `scaleY(${(1 / Number(k)).toFixed(4)})` }}>
                                  <i className="film-call-sat" style={{ "--dc": r.dot } as CSSProperties} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        </div>

        <div className="film-call-meta" data-anim="call-side">
          <span className="film-call-label">
            <i className="film-call-live" aria-hidden="true" />
            {CALL_COPY.live}
          </span>
          <span className="film-call-clock" data-call="clock">
            {callClock(0)}
            <span> / {callClock(CALL_TOTAL)}</span>
          </span>
          <span className="film-call-status" data-call="status" aria-live="polite">
            {`${CALL_COPY.status.ready} · `}
            <span>{CALL_COPY.sample}</span>
          </span>
        </div>

        <div className="film-call-notes" data-anim="call-side">
          <span className="film-call-label">{CALL_COPY.notes}</span>
          <dl>
            {CALL_NOTES.map(([k, v, at]) => (
              <div key={k} className="film-call-note" data-at={at} data-on="">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="film-call-cap" data-pill-avoid="always">
          {/* La transcripción entera para lectores de pantalla; lo visible se enciende palabra a palabra. */}
          <div className="sr-only">
            <p>{CALL_COPY.transcript}</p>
            {CALL_TRACKS.map((tr, track) => (
              <p key={tr.who}>
                {tr.who}: {CALL_PHRASES[track].map(([, , text]) => text).join(" ")}
              </p>
            ))}
          </div>
          <p className="film-call-intro">{CALL_COPY.intro}</p>
          {CALL_TRACKS.map((tr, track) => (
            <div key={tr.who} className="film-call-line" data-call-track={track} aria-hidden="true">
              <span className="film-call-who">
                {track ? (
                  <span className="film-call-avatar film-call-avatar-axi" aria-hidden="true">
                    <Mark />
                  </span>
                ) : (
                  <span className="film-call-avatar" aria-hidden="true">
                    CL
                  </span>
                )}
                {tr.who}
              </span>
              <p>
                {CALL_WORDS[track].map((w, i) => (
                  <span key={i} className="film-call-w" data-at={w.at.toFixed(2)}>
                    {`${w.word} `}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>

        <div className="film-call-time" data-pill-avoid="always" role="group" aria-label={CALL_COPY.timeline} data-anim="call-time">
          <div className="film-call-stages">
            {CALL_STAGES.map(([name, at]) => (
              <span key={name} style={{ left: pct(at) }} data-at={at} data-on="">
                {name}
              </span>
            ))}
          </div>
          <div className="film-call-wave">
            <svg viewBox="0 0 1000 36" preserveAspectRatio="none" aria-hidden="true">
              <path d={WAVE.client + WAVE.axi} className="film-call-wave-base" />
            </svg>
            <div className="film-call-reveal" aria-hidden="true">
              <div>
                <svg viewBox="0 0 1000 36" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`${id}wg`} gradientUnits="userSpaceOnUse" x1={WAVE.axiFrom.toFixed(0)} x2="1000">
                      <stop stopColor="#FF7A6E" />
                      <stop offset=".5" stopColor="#B48BFF" />
                      <stop offset="1" stopColor="#FFD580" />
                    </linearGradient>
                  </defs>
                  <path d={WAVE.client} stroke="var(--foreground)" />
                  <path d={WAVE.axi} stroke={`url(#${id}wg)`} />
                </svg>
              </div>
            </div>
            <span className="film-call-head-line" aria-hidden="true">
              <i />
            </span>
          </div>
        </div>
      </div>

      <CallPlayer />
    </section>
  );
}
