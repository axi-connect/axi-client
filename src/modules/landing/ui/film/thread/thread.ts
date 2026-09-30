/**
 * El hilo de luz de la película: un haz de fibra óptica que recorre toda la home
 * y enciende al protagonista de cada escena cuando llega.
 *
 * Uso (desde el motor, que ya tiene el scroll y los pins):
 *
 *   const thread = createThread({ root, getScroll, getPin, isDesktop });
 *   ScrollTrigger.addEventListener("refresh", thread.refresh);
 *   gsap.ticker.add(thread.frame);
 *   // al parar: ScrollTrigger.removeEventListener("refresh", thread.refresh);
 *   //           gsap.ticker.remove(thread.frame); thread.destroy();
 *
 * El módulo no importa gsap ni lenis: recibe el scroll y los pins como números.
 * Crea su propio canvas y lo quita al destruirse. El recorrido es un dato
 * (`domain/film/thread-path.ts`); con `enabled: false` o sin anclas, no hace nada.
 *
 * Coste (medido en el prototipo del 2026-09-30, 1440 px): ~0,4 ms de CPU por frame
 * y 60 fps. Solo dibuja cuando cambia el scroll, la ventana o el puntero; en
 * reposo, `frame()` compara tres números y sale. Si los frames se alargan de
 * verdad, baja de calidad (menos fibras) en vez de trabarse.
 */
import "./thread.css";

import { FILM_THREAD } from "@/modules/landing/domain/film/thread-path";
import {
  headAt,
  resampleSpine,
  sampleLit,
  sceneFraction,
  timeAnchors,
  type Anchor,
  type PinRange,
  type Sample,
  type SceneMeasure,
  type ThreadPath,
} from "@/modules/landing/domain/film/thread-geometry";

import { create2dRenderer } from "./thread-2d";
import { createGlRenderer, SPINE } from "./thread-gl";
import type { ThreadRenderer } from "./thread-renderer";

export type ThreadOptions = {
  /** La película: las escenas son sus `[data-scene]`. */
  root: HTMLElement;
  /** Posición de scroll actual (la de Lenis o la del contenedor). */
  getScroll(): number;
  /** El rango de scroll del pin de una escena, o `null` si no se fija. */
  getPin(scene: string): PinRange | null;
  isDesktop(): boolean;
  /** Para colocar marcas que siguen a la cabeza (p. ej. «vas aquí» en la meta). */
  onHead?(scene: string, point: { x: number; y: number }, fraction: number): void;
  path?: ThreadPath;
  /** Solo para tests: sustituye la creación del renderer. */
  createRenderer?(canvas: HTMLCanvasElement, mobile: boolean): ThreadRenderer | null;
};

export type FilmThread = { refresh(): void; frame(): void; destroy(): void };

const NOOP: FilmThread = { refresh() {}, frame() {}, destroy() {} };

/** Un frame que tarda más que esto (≈ 40 fps) cuenta como lento. */
const SLOW_FRAME_MS = 24;
const SLOW_FRAMES_TO_DEGRADE = 45;

function defaultRenderer(canvas: HTMLCanvasElement, mobile: boolean): ThreadRenderer | null {
  return createGlRenderer(canvas, { mobile }) ?? create2dRenderer(canvas);
}

export function createThread(options: ThreadOptions): FilmThread {
  const path = options.path ?? FILM_THREAD;
  if (!path.enabled) return NOOP;

  const canvas = document.createElement("canvas");
  canvas.className = "film-thread";
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.filmThread = "";
  const renderer = (options.createRenderer ?? defaultRenderer)(canvas, !options.isDesktop());
  if (!renderer) return NOOP;
  options.root.prepend(canvas);

  let width = 0;
  let height = 0;
  let anchors: Anchor[] = [];
  let sections = new Map<string, HTMLElement>();
  let filmEnd = Infinity;
  let dirty = true;
  let lastScroll = NaN;
  let off = false;
  const lit = new Set<string>();
  const samples: Sample[] = [];
  const spine = new Float32Array(SPINE * 4);

  const pointer = { x: -9999, y: -9999, strength: 0, tx: -9999, ty: -9999, ts: 0 };
  const finePointer = window.matchMedia?.("(pointer: fine)").matches ?? false;
  const onPointer = (e: PointerEvent) => {
    if (pointer.x < -999) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }
    pointer.tx = e.clientX;
    pointer.ty = e.clientY;
    pointer.ts = 1;
  };
  const onLeave = () => {
    pointer.ts = 0;
  };
  if (finePointer) {
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
  }
  const stepPointer = () => {
    const dx = pointer.tx - pointer.x;
    const dy = pointer.ty - pointer.y;
    const ds = pointer.ts - pointer.strength;
    if (Math.abs(dx) + Math.abs(dy) < 0.3 && Math.abs(ds) < 0.004) return false;
    pointer.x += dx * 0.14;
    pointer.y += dy * 0.14;
    pointer.strength += ds * 0.08;
    return true;
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, options.isDesktop() ? 1.5 : 1.25);
    renderer.resize(width, height, dpr);
    dirty = true;
  };
  window.addEventListener("resize", resize, { passive: true });

  const setLit = (scene: string, on: boolean) => {
    if (on === lit.has(scene)) return;
    if (on) lit.add(scene);
    else lit.delete(scene);
    const el = sections.get(scene);
    if (el) el.toggleAttribute("data-thread-lit", on);
  };

  const refresh = () => {
    resize();
    const scroll = options.getScroll();
    sections = new Map();
    for (const el of Array.from(options.root.querySelectorAll<HTMLElement>("[data-scene]"))) {
      const scene = el.dataset.scene;
      if (scene && !sections.has(scene)) sections.set(scene, el);
    }
    const measure = (scene: string): SceneMeasure | null => {
      const el = sections.get(scene);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { top: rect.top + scroll, width: rect.width, height: el.offsetHeight, pin: options.getPin(scene) };
    };
    anchors = timeAnchors(options.isDesktop() ? path.desktop : path.mobile, measure, height);
    const rootRect = options.root.getBoundingClientRect();
    filmEnd = rootRect.bottom + scroll;
    dirty = true;
  };

  // Frames lentos seguidos, solo mientras se dibuja de verdad.
  let lastDraw = 0;
  let slow = 0;
  const watch = (now: number) => {
    const dt = lastDraw ? now - lastDraw : 0;
    lastDraw = now;
    if (dt > 0 && dt < 200) {
      slow = dt > SLOW_FRAME_MS ? slow + 1 : Math.max(0, slow - 2);
      if (slow >= SLOW_FRAMES_TO_DEGRADE) {
        slow = 0;
        renderer.degrade();
      }
    }
  };

  const frame = () => {
    const moving = stepPointer();
    const scroll = options.getScroll();
    if (!dirty && !moving && scroll === lastScroll) {
      lastDraw = 0; // en reposo no hay frames que vigilar
      return;
    }
    dirty = false;
    lastScroll = scroll;

    // Pasada la película (pie de página), el canvas se apaga y no cuesta nada.
    const past = scroll > filmEnd;
    if (past !== off) {
      off = past;
      canvas.toggleAttribute("data-off", off);
      if (off) renderer.clear();
    }
    if (off || !anchors.length) return;

    watch(performance.now());
    const head = headAt(anchors, scroll);
    for (let k = 0; k < anchors.length; k++) if (anchors[k].ignite) setLit(anchors[k].scene, k <= head.index);

    const n = sampleLit(anchors, scroll, { width, height }, head, samples);
    const spineLength = resampleSpine(samples, n, SPINE, height * 1.6, spine);
    renderer.draw({
      spine,
      spineLength,
      samples,
      sampleCount: n,
      scroll,
      head: !head.done,
      pointer: { x: pointer.x, y: pointer.y, strength: pointer.strength },
    });

    if (options.onHead && !head.done && n) {
      const tip = samples[n - 1];
      options.onHead(anchors[head.index].scene, { x: tip.x, y: tip.y }, sceneFraction(anchors, head));
    }
  };

  return {
    refresh,
    frame,
    destroy() {
      window.removeEventListener("resize", resize);
      if (finePointer) {
        window.removeEventListener("pointermove", onPointer);
        document.documentElement.removeEventListener("pointerleave", onLeave);
      }
      for (const scene of Array.from(lit)) setLit(scene, false);
      renderer.destroy();
      canvas.remove();
    },
  };
}
