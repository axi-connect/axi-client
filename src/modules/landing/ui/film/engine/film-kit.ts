/**
 * El kit de los builders de escena del motor: utilidades y reglas comunes
 * (qué se anima, cuándo se fija una escena, el ritmo, los contadores).
 *
 * Lo usan `film-engine.ts` y los builders que viven en su propio módulo
 * (`goal-scene.ts`, `close-scene.ts`…), sin importarse entre sí. Como todo
 * `engine/`, importa gsap y solo lo carga el motor diferido (verja de ESLint).
 */
import { gsap } from "gsap";
import type { ScrollTrigger } from "gsap/ScrollTrigger";

import { FILM_NICHES } from "@/modules/landing/domain/film/niches";

/** `pins`: el ScrollTrigger de cada escena fijada, para el hilo de luz. */
export type Ctx = { desktop: boolean; pins: Map<string, ScrollTrigger> };
export type Scene = (section: HTMLElement, ctx: Ctx) => void;

/* ────────────────────────────── utilidades ────────────────────────────── */

export const all = (scope: ParentNode, sel: string) => Array.from(scope.querySelectorAll<HTMLElement>(sel));

/** El nicho que se ve: el `data-niche` del raíz de la película. */
export function activeNiche(section: HTMLElement): string {
  return section.closest<HTMLElement>("[data-niche]")?.dataset.niche ?? FILM_NICHES[0];
}

/**
 * Los elementos de `sel` que se ven: los de la escena fuera de variantes y los
 * de la variante del nicho activo. Las escenas traen las cuatro variantes en el
 * HTML, pero solo se anima la visible (§12, reglas de construcción); al cambiar
 * de nicho el motor rehace las líneas (`setNiche`).
 */
export function visible(section: HTMLElement, sel: string): HTMLElement[] {
  const niche = activeNiche(section);
  return all(section, sel).filter((el) => {
    const variant = el.closest<HTMLElement>("[data-only]");
    return !variant || (variant.dataset.only ?? "").split(" ").includes(niche);
  });
}

/**
 * Lo mismo, como un único grupo (la forma que usan las escenas: un grupo por
 * nicho con los mismos tiempos). Vacío si no hay nada que animar.
 */
export function perNiche(section: HTMLElement, sel: string): HTMLElement[][] {
  const group = visible(section, sel);
  return group.length ? [group] : [];
}

/** Escribe texto solo si cambió: en un scrub, `onUpdate` corre en cada frame. */
export function setText(el: HTMLElement, text: string) {
  if (el.textContent !== text) el.textContent = text;
}

/**
 * Ritmo de la película: multiplica la longitud de cada pin. Medido en el render
 * del 2026-09-30: con 1 la película de escritorio pasaba de 30.000 px.
 */
export const PACE = 0.8;

export const reveal = { opacity: 0, y: 24 };

/** Las escenas que se fijan: donde la animación ES el mensaje. */
export const PINNED = new Set(["radar", "followup", "chat", "goal", "axel", "measure"]);

/**
 * Una línea de tiempo de escena: fijada si cabe, revelada al pasar si no.
 *
 * El titular de la escena NO va en la línea fijada: aparece mientras la escena
 * entra en pantalla, para que al fijarse ya se lea de qué trata y la escena no
 * llegue como un escenario vacío.
 */
/** Sin fijar: qué elemento y qué tramo del scroll reproducen la escena. */
export type Pass = { trigger?: Element; start?: string; end?: string };

export function sceneTimeline(section: HTMLElement, ctx: Ctx, length: number, pass: Pass = {}): gsap.core.Timeline {
  const heads = all(section, "[data-anim=head]");
  if (heads.length) {
    gsap.from(heads, { ...reveal, ease: "power2.out", scrollTrigger: { trigger: section, start: "top 88%", end: "top 30%", scrub: true } });
  }
  // Solo los momentos largos se fijan (chat, radar, seguimiento, la meta, Axel
  // y medir, cuyo horizonte y fibras se cruzarían en unos píxeles); el
  // resto se revela al pasar. Todo fijado daba un ritmo plano y 28.000 px.
  const fits = ctx.desktop && PINNED.has(section.dataset.scene ?? "") && section.offsetHeight <= window.innerHeight * 1.02;
  const tl = gsap.timeline({
    defaults: { ease: "power2.out", duration: 1 },
    scrollTrigger: fits
      ? { trigger: section, start: "top top", end: `+=${Math.round(length * PACE)}%`, pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true }
      : { trigger: pass.trigger ?? section, start: pass.start ?? "top 78%", end: pass.end ?? "bottom 62%", scrub: true, invalidateOnRefresh: true },
  });
  if (fits && tl.scrollTrigger) ctx.pins.set(section.dataset.scene ?? "", tl.scrollTrigger);
  return tl;
}

/** Cuenta hacia arriba un número con separador de miles colombiano. */
export function countUp(tl: gsap.core.Timeline, el: HTMLElement, at: number) {
  const target = Number((el.textContent ?? "").replace(/[^\d]/g, ""));
  if (!Number.isFinite(target) || target <= 0) return;
  const prefix = (el.textContent ?? "").match(/^[^\d]*/)?.[0] ?? "";
  const proxy = { v: 0 };
  tl.to(
    proxy,
    {
      v: target,
      ease: "power1.out",
      onUpdate: () => {
        setText(el, prefix + Math.round(proxy.v).toLocaleString("es-CO"));
      },
    },
    at,
  );
}

/* ──────────────────── tiempos de lienzo (escenas nuevas) ──────────────────── */

/**
 * Las escenas de §11 usan los tiempos de su lienzo: `p` de 0 a 1 sobre `SPAN`
 * unidades de línea, igual que el chat.
 */
export const SPAN = 10;
export const atP = (p: number) => p * SPAN;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const segP = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
export const easeOut3 = (t: number) => 1 - Math.pow(1 - t, 3);

/** Una línea de escena de §11 con su duración fija (`SPAN`). */
export function spanTimeline(section: HTMLElement, ctx: Ctx, length: number, pass?: Pass) {
  const tl = sceneTimeline(section, ctx, length, pass);
  tl.to({}, { duration: 0 }, SPAN);
  return tl;
}

/** Aparece (opacidad y un poco de subida) en el tramo [from, to] de la escena. */
export function showIn(tl: gsap.core.Timeline, els: HTMLElement[], from: number, to: number, dy = 14) {
  if (els.length) tl.fromTo(els, { opacity: 0, y: dy }, { opacity: 1, y: 0, ease: "power3.out", duration: atP(to - from) }, atP(from));
}

/**
 * Un contador del tramo [from, to]: `paint(v)` recibe de 0 a 1. Se pinta el
 * inicio al construir (sin esto, el texto del HTML, que es el final, se vería
 * hasta que el scroll llegara al tramo).
 */
export function counter(tl: gsap.core.Timeline, from: number, to: number, paint: (v: number) => void, ease = "power3.out") {
  const proxy = { v: 0 };
  paint(0);
  tl.fromTo(proxy, { v: 0 }, { v: 1, ease, duration: atP(to - from), onUpdate: () => paint(proxy.v) }, atP(from));
}

export const num = (el: HTMLElement, key: string) => Number(el.dataset[key] ?? 0);
