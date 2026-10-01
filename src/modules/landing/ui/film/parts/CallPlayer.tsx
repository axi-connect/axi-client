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
 *   voz y escribe 13 variables CSS en la sección. Todo lo que se mueve son
 *   `transform` y `opacity` de capas ya pintadas.
 * - Palabras, reloj, notas y etapas se tocan solo al cambiar (~40 veces por llamada).
 * - Se pausa al salir de pantalla o de la pestaña. Con movimiento reducido no se
 *   escriben bandas: el audio y los subtítulos siguen igual.
 */

/** Bordes de las 8 bandas en bins de un fftSize 256 (~187 Hz por bin a 48 kHz) y su ganancia. */
const EDGES = [1, 2, 3, 4, 6, 8, 11, 15, 21];
const GAIN = [0.9, 1, 1, 1.08, 1.2, 1.35, 1.6, 1.9];
const BANDS = ["--b0", "--b1", "--b2", "--b3", "--b4", "--b5", "--b6", "--b7"];
const VARS = [...BANDS, "--lo", "--mid", "--hi", "--e"];
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

    // Cada variable se escribe SOLO en los elementos que la leen: escrita en la
    // sección, invalidaba el estilo de toda la escena en cada frame (perfil del
    // 2026-10-01 con CPU × 4: p50 de 83 ms sonando). Y solo si cambió.
    type Sink = { el: HTMLElement; vars: string[]; last: Map<string, string> };
    const sinks: Sink[] = [];
    const sink = (sel: string, vars: string[]) => {
      for (const el of q(sel)) sinks.push({ el, vars, last: new Map() });
    };
    sink(".film-call-cor", BANDS);
    sink(".film-call-fields", ["--lo", "--mid", "--hi", "--e"]);
    q(".film-call-orbit").forEach((el, i) => sinks.push({ el, vars: [["--lo", "--mid", "--hi"][i] ?? "--e"], last: new Map() }));
    sink(".film-call-reflect, .film-call-ripples, .film-call-bloom, .film-call-core", ["--e"]);
    sink(".film-call-wave", ["--p"]);
    const values = new Map<string, string>();
    const set = (k: string, v: string) => values.set(k, v);
    const flush = () => {
      for (const s of sinks) {
        for (const k of s.vars) {
          const v = values.get(k);
          if (v === undefined || s.last.get(k) === v) continue;
          s.last.set(k, v);
          s.el.style.setProperty(k, v);
        }
      }
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
      pearl.setAttribute("aria-label", playing ? CALL_COPY.pause : done ? CALL_COPY.again : CALL_COPY.play);
      pearl.setAttribute("aria-pressed", String(playing));
    };

    const stop = (end: boolean) => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      lv.fill(0);
      for (const k of VARS) set(k, "0");
      if (end) set("--p", "1");
      flush();
    };

    const loop = () => {
      if (raf) return;
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const step = () => {
        const local = audio[track].currentTime;
        const t = Math.min(CALL_TOTAL, CALL_START[track] + local);
        set("--p", (t / CALL_TOTAL).toFixed(3));
        if (an && bins && !calm) {
          an.getByteFrequencyData(bins);
          let sum = 0;
          for (let k = 0; k < 8; k++) {
            let a = 0;
            for (let i = EDGES[k]; i < EDGES[k + 1]; i++) a += bins[i];
            const v = clamp01(((a / (EDGES[k + 1] - EDGES[k]) / 255) * GAIN[k] - 0.3) / 0.6);
            lv[k] += (v - lv[k]) * (v > lv[k] ? 0.55 : 0.16);
            sum += lv[k];
            set(BANDS[k], lv[k].toFixed(2));
          }
          set("--lo", ((lv[0] + lv[1] + lv[2]) / 3).toFixed(2));
          set("--mid", ((lv[3] + lv[4] + lv[5]) / 3).toFixed(2));
          set("--hi", ((lv[6] + lv[7]) / 2).toFixed(2));
          set("--e", (sum / 8).toFixed(2));
        }
        flush();
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
        set("--p", "0");
        flush();
      }
      playing = true;
      paint(CALL_START[track] + audio[track].currentTime);
      void audio[track].play();
      loop();
    };

    const ended0 = () => {
      track = 1;
      a1.currentTime = 0;
      void a1.play();
    };
    const ended1 = () => {
      playing = false;
      done = true;
      stop(true);
      paint(CALL_TOTAL);
    };

    pearl.addEventListener("click", toggle);
    a0.addEventListener("ended", ended0);
    a1.addEventListener("ended", ended1);
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
