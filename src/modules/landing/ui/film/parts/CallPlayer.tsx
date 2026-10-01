"use client";

import { useEffect, useRef } from "react";

import { CALL_COPY, CALL_START, CALL_TOTAL, CALL_TRACKS, callClock } from "@/modules/landing/domain/film/call-time";

/**
 * El reproductor de «Escucha la llamada» (plan §20). La escena entera la pinta
 * el servidor (`scenes/call-scene.tsx`): aquí solo vive el audio y lo que cambia
 * con él, escrito directo en el DOM y solo cuando cambia. Sin React por frame y
 * sin volver a enviar al navegador el dibujo de la esfera, la onda o los textos.
 *
 * Por qué es barato (lo que pidió la dueña):
 * - Web Audio nativo: un `AnalyserNode` que nace al primer toque; antes no se
 *   descarga nada (`preload="none"`).
 * - Un `requestAnimationFrame` que solo existe mientras suena: lee 8 bandas de
 *   voz y escribe `transform` y `opacity` directos en ~16 capas ya pintadas
 *   (sin variables CSS por frame) más 64 trazos en el canvas de la corona.
 * - Palabras, reloj, notas y etapas se tocan solo al cambiar (~40 veces por llamada).
 * - Se pausa al salir de pantalla o de la pestaña. Con movimiento reducido no se
 *   escriben bandas: el audio y los subtítulos siguen igual.
 */

/** Bordes de las 8 bandas en bins de un fftSize 256 (~187 Hz por bin a 48 kHz) y su ganancia. */
const EDGES = [1, 2, 3, 4, 6, 8, 11, 15, 21];
const GAIN = [0.9, 1, 1, 1.08, 1.2, 1.35, 1.6, 1.9];
const GLYPH = {
  play: "M9.2 5.9v12.2c0 .5.5.8.9.5l9.6-6.1a.6.6 0 0 0 0-1l-9.6-6.1a.6.6 0 0 0-.9.5z",
  pause: "M8.5 5.5h2.6v13H8.5zM12.9 5.5h2.6v13h-2.6z",
  again: "M12 5a7 7 0 1 1-6.6 4.7l1.8.7A5.1 5.1 0 1 0 12 6.9v2.6L7.9 6.1 12 2.7z",
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const at = (el: HTMLElement) => Number(el.dataset.at ?? 0);
const flag = (el: Element, name: string, on: boolean) => {
  if (el.hasAttribute(name) !== on) el.toggleAttribute(name, on);
};

export function CallPlayer() {
  const r0 = useRef<HTMLAudioElement>(null);
  const r1 = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const a0 = r0.current;
    const a1 = r1.current;
    const section = a0?.closest<HTMLElement>("[data-scene=call]");
    const pearl = section?.querySelector<HTMLButtonElement>(".film-call-pearl");
    if (!a0 || !a1 || !section || !pearl) return;
    const audio = [a0, a1];
    const q = <T extends Element = HTMLElement>(sel: string) => Array.from(section.querySelectorAll<T & HTMLElement>(sel));
    const words = [q(`[data-call-track="0"] .film-call-w`), q(`[data-call-track="1"] .film-call-w`)];
    const notes = q(".film-call-note");
    const stages = q(".film-call-stages span");
    const clock = q("[data-call=clock]");
    const status = q("[data-call=status]");
    const glyph = pearl.querySelector("path");

    // Lo que late con la voz: transform y opacity escritos directo, solo si
    // cambian, en ~16 capas. Sin variables CSS por frame: una variable que
    // alimenta calc() o gradientes recalculaba estilos caros en toda la escena
    // (perfil del 2026-10-01 con CPU × 4: 22 ms por recálculo sonando).
    const last = new Map<HTMLElement, Record<string, string>>();
    const put = (el: HTMLElement | undefined, prop: "transform" | "opacity", v: string) => {
      if (!el) return;
      let seen = last.get(el);
      if (!seen) last.set(el, (seen = {}));
      if (seen[prop] === v) return;
      seen[prop] = v;
      el.style[prop] = v;
    };
    const one = (sel: string) => section.querySelector<HTMLElement>(sel) ?? undefined;
    const fields = one(".film-call-fields");
    const reflect = one(".film-call-reflect");
    const ripples = one(".film-call-ripples");
    const bloomA = one(".film-call-bl-a > i");
    const bloomS = one(".film-call-bl-s > i");
    const cores = q(".film-call-core");
    const arcs = q(".film-call-arc");
    const reveal = one(".film-call-reveal");
    const revealIn = one(".film-call-reveal > div");
    const head = one(".film-call-head-line");
    const corona = section.querySelector<HTMLCanvasElement>(".film-call-corona");
    const cctx = corona?.getContext("2d") ?? null;

    /** La corona: 64 marcas en espejo (graves arriba, agudos abajo), color por ángulo. */
    const BRAND = ["#FF7A6E", "#E65759", "#B48BFF", "#9A4FFF", "#FFC04D", "#FFD580"];
    const TICKS = Array.from({ length: 64 }, (_, i) => {
      const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      const a = (i * Math.PI * 2) / 64 - Math.PI / 2;
      return {
        cos: Math.cos(a),
        sin: Math.sin(a),
        band: Math.min(7, Math.floor((Math.min(i, 64 - i) / 32) * 8)),
        w: 2.6 * (0.8 + (x - Math.floor(x)) * 0.45),
        color: BRAND[Math.floor((((i + 4) % 64) / 64) * 6)],
      };
    });
    const drawCorona = () => {
      if (!corona || !cctx) return;
      const k = corona.width / 280;
      cctx.setTransform(k, 0, 0, k, 140 * k, 140 * k);
      cctx.clearRect(-140, -140, 280, 280);
      cctx.lineWidth = 2;
      cctx.lineCap = "round";
      cctx.globalAlpha = playing ? 0.85 : 0.22;
      const brand = (playing && track === 1) || done;
      if (!brand) cctx.strokeStyle = "#f5f5f7";
      for (const t of TICKS) {
        const len = 10 * (0.35 + lv[t.band] * t.w);
        if (brand) cctx.strokeStyle = t.color;
        cctx.beginPath();
        cctx.moveTo(t.cos * 98, t.sin * 98);
        cctx.lineTo(t.cos * (98 + len), t.sin * (98 + len));
        cctx.stroke();
      }
    };

    /** Escribe el fotograma de la voz: niveles lv[0..7] y avance p. */
    const pulse = (p: number) => {
      const lo = (lv[0] + lv[1] + lv[2]) / 3;
      const mid = (lv[3] + lv[4] + lv[5]) / 3;
      const hi = (lv[6] + lv[7]) / 2;
      let e = 0;
      for (const v of lv) e += v / 8;
      const n = (v: number) => v.toFixed(3);
      put(fields, "opacity", n(Math.min(1, 0.55 + e * 0.6)));
      put(reflect, "opacity", n(Math.min(1, 0.08 + e * 0.9)));
      put(ripples, "opacity", n(Math.min(1, e * 1.8)));
      put(bloomA, "opacity", n(Math.min(1, 0.32 + e * 1.1)));
      put(bloomS, "opacity", n(Math.min(1, 0.25 + e * 1.1)));
      for (const c of cores) put(c, "transform", `scale(${n(0.86 + e * 0.4)})`);
      arcs.forEach((a, i) => put(a, "opacity", n(Math.min(1, 0.7 + [lo, mid, hi][i % 3] * 0.6))));
      put(reveal, "transform", `translateX(${n((p - 1) * 100)}%)`);
      put(revealIn, "transform", `translateX(${n((1 - p) * 100)}%)`);
      put(head, "transform", `translateX(${n((p - 1) * 100)}%)`);
      drawCorona();
    };

    let ctx: AudioContext | undefined;
    let an: AnalyserNode | undefined;
    let bins: Uint8Array<ArrayBuffer> | undefined;
    const lv = new Float32Array(8);
    let raf = 0;
    let key = "";
    let track = 0;
    let playing = false;
    let done = false;
    let progress = 0;
    let frame = 0;
    let unlocked = false;

    /** Pinta el estado discreto (quién habla, palabras, notas, etapas, reloj). */
    const paint = (t: number) => {
      const local = t - CALL_START[track];
      section.dataset.cap = String(track);
      if (playing) section.dataset.speaker = track ? "axi" : "client";
      else delete section.dataset.speaker;
      flag(section, "data-playing", playing);
      flag(section, "data-done", done);
      words.forEach((list, i) => {
        let lit = 0;
        for (const w of list) {
          const on = done || (i === track && at(w) <= local) || i < track;
          flag(w, "data-on", on);
          if (on && i === track) lit++;
        }
        list.forEach((w, j) => flag(w, "data-now", playing && i === track && j === lit - 1));
      });
      for (const n of notes) flag(n, "data-on", done || at(n) <= t);
      for (const s of stages) flag(s, "data-on", done || at(s) <= t);
      for (const c of clock) c.firstChild!.textContent = callClock(t);
      const text = done ? CALL_COPY.status.done : !playing ? CALL_COPY.status.paused : track ? CALL_COPY.status.axi : CALL_COPY.status.client;
      for (const s of status) s.firstChild!.textContent = `${text} · `;
      glyph?.setAttribute("d", playing ? GLYPH.pause : done ? GLYPH.again : GLYPH.play);
      // Un solo anuncio: el estado lo dice aria-pressed; la etiqueta solo cambia al terminar.
      pearl.setAttribute("aria-label", done ? CALL_COPY.again : CALL_COPY.play);
      pearl.setAttribute("aria-pressed", String(playing));
    };

    const stop = (end: boolean) => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      lv.fill(0);
      pulse(end ? 1 : progress);
    };

    const loop = () => {
      if (raf) return;
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const step = () => {
        const local = audio[track].currentTime;
        const t = Math.min(CALL_TOTAL, CALL_START[track] + local);
        progress = t / CALL_TOTAL;
        if (an && bins && !calm) {
          an.getByteFrequencyData(bins);
          for (let k = 0; k < 8; k++) {
            let a = 0;
            for (let i = EDGES[k]; i < EDGES[k + 1]; i++) a += bins[i];
            const v = clamp01(((a / (EDGES[k + 1] - EDGES[k]) / 255) * GAIN[k] - 0.3) / 0.6);
            lv[k] += (v - lv[k]) * (v > lv[k] ? 0.55 : 0.16);
          }
        }
        // La voz se escribe a ~20 Hz y el compositor interpola (transition de 100 ms
        // en el CSS): el hilo principal toca las capas 1 de cada 3 frames.
        if (frame++ % 3 === 0) pulse(progress);
        // Lo discreto solo se repinta al cambiar: palabra, segundo, nota o etapa.
        const lit = words[track].filter((w) => at(w) <= local).length;
        const next = `${track}|${lit}|${Math.floor(t)}|${notes.filter((n) => at(n) <= t).length}|${stages.filter((s) => at(s) <= t).length}`;
        if (next !== key) {
          key = next;
          paint(t);
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const wire = () => {
      if (ctx) {
        void ctx.resume();
        return;
      }
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      an = ctx.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.6;
      for (const a of audio) ctx.createMediaElementSource(a).connect(an);
      an.connect(ctx.destination);
      bins = new Uint8Array(an.frequencyBinCount);
    };

    const pause = () => {
      if (!playing) return;
      audio[track].pause();
      playing = false;
      stop(false);
      paint(Math.min(CALL_TOTAL, CALL_START[track] + audio[track].currentTime));
    };

    const toggle = () => {
      wire();
      if (playing) return pause();
      if (done || !section.hasAttribute("data-started")) {
        // Primera vez (o de nuevo): la escena deja el fotograma final y empieza en cero.
        for (const a of audio) a.currentTime = 0;
        track = 0;
        done = false;
        key = "";
        section.toggleAttribute("data-started", true);
        progress = 0;
        pulse(0);
      }
      playing = true;
      paint(CALL_START[track] + audio[track].currentTime);
      start(audio[track]);
      // iOS solo deja sonar lo que arrancó un gesto: la 2.ª pista se desbloquea ya,
      // en silencio, para que el «ended» de la 1.ª pueda encadenarla.
      if (!unlocked) {
        unlocked = true;
        a1.muted = true;
        a1.play().then(() => {
          if (track === 0) a1.pause();
          a1.currentTime = 0;
          a1.muted = false;
        }, () => {
          a1.muted = false;
        });
      }
    };

    /** Reproduce y, si el navegador no deja (red, política de audio), vuelve a «Lista» sin dejar el bucle girando. */
    const start = (a: HTMLAudioElement) => {
      loop();
      a.play().catch(fail);
    };
    const fail = () => {
      if (!playing) return;
      playing = false;
      stop(false);
      paint(Math.min(CALL_TOTAL, CALL_START[track] + audio[track].currentTime));
    };

    const ended0 = () => {
      track = 1;
      a1.currentTime = 0;
      a1.muted = false;
      start(a1);
    };
    const ended1 = () => {
      playing = false;
      done = true;
      stop(true);
      paint(CALL_TOTAL);
    };

    if (corona) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      corona.width = corona.height = Math.round(280 * dpr);
    }
    drawCorona();
    pearl.addEventListener("click", toggle);
    a0.addEventListener("ended", ended0);
    a1.addEventListener("ended", ended1);
    // Solo corta la llamada el error de la pista que suena (la 2.ª puede fallar al desbloquearse).
    const onError = (e: Event) => {
      if (e.target === audio[track]) fail();
    };
    for (const a of audio) a.addEventListener("error", onError);
    // Fuera de pantalla o de la pestaña, la llamada se pausa (y el bucle se va con ella).
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) pause();
    });
    io.observe(section);
    const onHide = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      pearl.removeEventListener("click", toggle);
      a0.removeEventListener("ended", ended0);
      a1.removeEventListener("ended", ended1);
      for (const a of audio) a.removeEventListener("error", onError);
      io.disconnect();
      document.removeEventListener("visibilitychange", onHide);
      for (const a of audio) a.pause();
      stop(false);
      void ctx?.close();
    };
  }, []);

  return (
    <>
      <audio ref={r0} src={CALL_TRACKS[0].src} preload="none" />
      <audio ref={r1} src={CALL_TRACKS[1].src} preload="none" />
    </>
  );
}
