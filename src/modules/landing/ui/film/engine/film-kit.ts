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

/**
 * `pins`: el ScrollTrigger de cada escena fijada, para el hilo de luz.
 * `settled`: escenas que ya estaban en pantalla cuando el motor llegó con el
 * visitante a mitad de página. No vuelven al inicio de su scrub (se apagaban y
 * reaparecían: el «salto», ronda 2, R4): su línea queda en el fotograma final
 * (`finals`, el motor la lleva a 1 al terminar de construir la escena).
 */
export type Ctx = {
  desktop: boolean;
  pins: Map<string, ScrollTrigger>;
  settled?: ReadonlySet<Element>;
  finals?: gsap.core.Timeline[];
};
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
 * Escribe una propiedad de estilo solo si cambió (el scrub llama en cada
 * frame). Guarda el `style` original de cada elemento que toca: `restore` lo
 * devuelve, así que al parar el motor la escena vuelve a su fotograma final
 * del servidor, como las que animan con tweens de gsap.
 *
 * `flag` hace lo mismo con un atributo (presente o no, o con un valor) y
 * `text` con el texto: también vuelven al HTML del servidor con `restore`.
 * Lo usan las escenas que pintan un fotograma puro por frame (la meta, el piloto).
 */
export function writer() {
  type El = HTMLElement | SVGElement;
  const last = new Map<El, Record<string, string>>();
  const original = new Map<El, string | null>();
  const attrs = new Map<El, Map<string, string | null>>();
  const texts = new Map<HTMLElement, string>();
  const write = (els: readonly El[], prop: "transform" | "opacity" | "strokeDasharray", value: string) => {
    for (const el of els) {
      let seen = last.get(el);
      if (!seen) {
        last.set(el, (seen = {}));
        original.set(el, el.getAttribute("style"));
      }
      if (seen[prop] === value) continue;
      seen[prop] = value;
      el.style[prop] = value;
    }
  };
  const flag = (els: readonly El[], name: string, value: string | boolean) => {
    const next = value === false ? null : value === true ? "" : value;
    for (const el of els) {
      let saved = attrs.get(el);
      if (!saved) attrs.set(el, (saved = new Map()));
      if (!saved.has(name)) saved.set(name, el.getAttribute(name));
      if (el.getAttribute(name) === next) continue;
      if (next === null) el.removeAttribute(name);
      else el.setAttribute(name, next);
    }
  };
  const text = (els: readonly HTMLElement[], value: string) => {
    for (const el of els) {
      if (!texts.has(el)) texts.set(el, el.textContent ?? "");
      setText(el, value);
    }
  };
  const restore = () => {
    for (const [el, style] of original) {
      if (style === null) el.removeAttribute("style");
      else el.setAttribute("style", style);
    }
    for (const [el, saved] of attrs) {
      for (const [name, value] of saved) {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      }
    }
    for (const [el, value] of texts) setText(el, value);
    last.clear();
    original.clear();
    attrs.clear();
    texts.clear();
  };
  return { write, flag, text, restore };
}

/**
 * Ritmo de la película: multiplica la longitud de cada pin. Medido en el render
 * del 2026-09-30: con 1 la película de escritorio pasaba de 30.000 px.
 */
export const PACE = 0.8;

export const reveal = { opacity: 0, y: 24 };

/**
 * Las escenas que se fijan (en escritorio, si caben): toda escena con una
 * animación que contar. La dueña, 2026-10-02: «si es necesario esperar y
 * detenerse un momento para ir ejecutando la animación… da la sensación de que
 * es más guiado». Sin fijar, la animación empezaba con la escena apenas asomando
 * y terminaba a media pantalla.
 */
export const PINNED = new Set(["video", "radar", "pilot", "followup", "chat", "photo", "vault", "team", "collect", "pipeline", "goal", "axel", "measure"]);

/**
 * Una línea de tiempo de escena: fijada si cabe, revelada al pasar si no.
 *
 * El titular de la escena NO va en la línea fijada: aparece mientras la escena
 * entra en pantalla, para que al fijarse ya se lea de qué trata y la escena no
 * llegue como un escenario vacío.
 */
/** Sin fijar: qué elemento y qué tramo del scroll reproducen la escena. */
export type Pass = { trigger?: Element; start?: string | (() => string); end?: string | (() => string) };

/**
 * Si la escena se fija: en escritorio, en la lista y si cabe en la ventana. El
 * motor lo vuelve a preguntar tras cada refresh: si cambia solo el alto de la
 * ventana (DevTools, 1280 × 720) la película se rehace (ronda 2, R6).
 */
export function pinFits(section: HTMLElement, desktop: boolean): boolean {
  return desktop && PINNED.has(section.dataset.scene ?? "") && section.offsetHeight <= window.innerHeight * 1.02;
}

export function sceneTimeline(section: HTMLElement, ctx: Ctx, length: number, pass: Pass = {}): gsap.core.Timeline {
  const heads = all(section, "[data-anim=head]");
  const fits = pinFits(section, ctx.desktop);
  // Ya en pantalla al llegar el motor (R4) y sin fijar: sin scrub, al final.
  if (!fits && ctx.settled?.has(section)) {
    const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 1 }, paused: true });
    ctx.finals?.push(tl);
    return tl;
  }
  if (heads.length) {
    gsap.from(heads, { ...reveal, ease: "power2.out", scrollTrigger: { trigger: section, start: "top 88%", end: "top 30%", scrub: true } });
  }
  // Solo los momentos largos se fijan (chat, radar, seguimiento, la meta, Axel
  // y medir, cuyo horizonte y fibras se cruzarían en unos píxeles); el
  // resto se revela al pasar. Todo fijado daba un ritmo plano y 28.000 px.
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
/**
 * Sin fijar, el fotograma final llega con la escena entera en pantalla (QA del
 * 2026-09-30: con «bottom 62%» el sello, la cita o la cifra llegaban cuando la
 * escena ya se iba bajo la cabecera).
 */
/*
 * Y la animación corre mientras la escena ya se ve (dueña, 2026-10-02): con
 * «top 85 %» arrancaba con la escena apenas asomando, y en móvil «bottom 95 %»
 * la terminaba cuando ya casi se iba. Ahora empieza con la escena a media
 * pantalla y acaba con ella entera a la vista, bajo la cabecera fija (auditoría R7).
 */
export const PASS_DESKTOP: Pass = { start: "top 55%", end: "top 12%" };
// En móvil la escena puede ser más alta que la pantalla: acaba cuando su pie entra.
export const PASS_MOBILE: Pass = { start: "top 55%", end: "bottom bottom" };

export function spanTimeline(section: HTMLElement, ctx: Ctx, length: number, pass?: Pass) {
  const tl = sceneTimeline(section, ctx, length, pass ?? (ctx.desktop ? PASS_DESKTOP : PASS_MOBILE));
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
