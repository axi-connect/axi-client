/**
 * El kit de los builders de escena del motor: utilidades y reglas comunes
 * (qué se anima, cuándo se fija una escena, el ritmo, los contadores).
 *
 * Lo usan `film-engine.ts` y los builders que viven en su propio módulo
 * (`goal-scene.ts`, `close-scene.ts`…), sin importarse entre sí. Como todo
 * `engine/`, importa gsap y solo lo carga el motor diferido (verja de ESLint).
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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
 * Si la escena se fija: en escritorio y en la lista, SIEMPRE. Si no cabe en la
 * ventana, su contenido se escala hasta caber (`fitToViewport`). Antes, en un
 * portátil bajo (1366 × 768 de pantalla son ~650 px de ventana) el piloto, la
 * meta, la foto o cobrar caían al pase sin fijar: la animación empezaba con la
 * escena asomando y acababa antes de encuadrarse (la dueña, 2026-10-01).
 */
export function pinFits(section: HTMLElement, desktop: boolean): boolean {
  return desktop && PINNED.has(section.dataset.scene ?? "");
}

/** Lo que va en el flujo de la escena (lo absoluto, como los mapas de fondo, ya llena la ventana). */
function inFlow(el: Element, out: HTMLElement[] = []): HTMLElement[] {
  for (const child of el.children) {
    const cs = getComputedStyle(child);
    if (cs.display === "contents") inFlow(child, out);
    else if (cs.position !== "absolute" && cs.position !== "fixed" && cs.display !== "none") out.push(child as HTMLElement);
  }
  return out;
}

/** Escala mínima: por debajo, el texto deja de leerse; mejor que asome el pie. */
const FIT_MIN = 0.6;

/**
 * Lo más alto que se ve del contenido (texto o medios), en px desde el borde
 * de la escena, en su sitio de reposo. Lo absoluto de fondo no cuenta: va bajo
 * la isla a propósito. Los transforms en línea (el reveal del titular está en
 * su `from` durante el refresh, 24 px más abajo) se neutralizan para medir.
 */
function contentTop(section: HTMLElement, kids: HTMLElement[]): number {
  const moved = kids.flatMap((k) => all(k, "[style*='transform']"));
  const saved = moved.map((el) => el.style.transform);
  for (const el of moved) el.style.transform = "none";
  const top0 = section.getBoundingClientRect().top;
  let top = Infinity;
  for (const kid of kids) {
    const walker = document.createTreeWalker(kid, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!n.textContent?.trim() || !el?.getClientRects().length) continue;
      top = Math.min(top, el.getBoundingClientRect().top - top0);
    }
    for (const el of kid.querySelectorAll("img, svg, canvas, video")) {
      const r = el.getBoundingClientRect();
      if (r.width > 24 && r.height > 24) top = Math.min(top, r.top - top0);
    }
  }
  moved.forEach((el, i) => (el.style.transform = saved[i]));
  return top;
}

/** La isla del sitio (con su aviso) ocupa hasta ~70 px: el contenido de una escena fijada empieza por debajo. */
const SAFE_TOP = 96;

/**
 * Hace caber la escena fijada en la ventana con `zoom` sobre su contenido en
 * el flujo (`zoom` reflowea, así que la escena mide de verdad lo que se ve) y
 * cuida que su contenido no empiece bajo la isla (≥ `SAFE_TOP`): si el zoom lo
 * sube, la escena gana relleno arriba y se vuelve a ajustar. El zoom no siempre
 * encoge en proporción (hay altos ligados a la ventana, como en medir), así
 * que se mide y se corrige en bucle. Se hace antes de crear el trigger y en
 * cada `refreshInit` (cambio de tamaño), nunca por frame.
 */
function fitToViewport(section: HTMLElement) {
  const kids = inFlow(section);
  const fit = () => {
    for (const el of kids) el.style.removeProperty("zoom");
    section.style.removeProperty("padding-top");
    section.style.removeProperty("align-items");
    const base = kids.map((el) => parseFloat(getComputedStyle(el).zoom) || 1);
    const pad0 = parseFloat(getComputedStyle(section).paddingTop) || 0;
    const vh = window.innerHeight;
    let k = 1;
    let pad = pad0;
    // Primero el margen bajo la isla, luego caber; hasta que ninguno cambie.
    for (let i = 0; i < 12; i++) {
      let changed = false;
      const gap = SAFE_TOP - contentTop(section, kids);
      if (gap > 0.5) {
        // Centrada, el relleno solo la bajaría la mitad: se alinea arriba.
        section.style.alignItems = "flex-start";
        pad += gap;
        section.style.paddingTop = `${pad}px`;
        changed = true;
      }
      const over = section.offsetHeight / vh;
      if (over > 1 && k > FIT_MIN) {
        k = Math.max(FIT_MIN, (k * 0.985) / over);
        kids.forEach((el, j) => (el.style.zoom = String(base[j] * k)));
        changed = true;
      }
      if (!changed) break;
    }
  };
  fit();
  ScrollTrigger.addEventListener("refreshInit", fit);
  gsap.context()?.add(() => () => {
    ScrollTrigger.removeEventListener("refreshInit", fit);
    for (const el of kids) el.style.removeProperty("zoom");
    section.style.removeProperty("padding-top");
    section.style.removeProperty("align-items");
  });
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
  // Fijar es CSS, no el `pin` de GSAP: la escena va `sticky` dentro de un
  // envoltorio tan alto como su recorrido (clase `pin-spacer`, la que buscan
  // las anclas, el riel y R4). Con `pin`, cada escena fijada encolaba un
  // refresh completo de ScrollTrigger en el frame siguiente que revertía y
  // volvía a medir todos los pins: 11–13 refrescos de 300–700 ms con CPU ×4 al
  // construir (M5). Sin `pin` no hay nada que revertir y el refresh es barato.
  if (fits) fitToViewport(section);
  const spacer = fits ? stick(section, length * PACE) : null;
  if (heads.length) {
    gsap.from(heads, { ...reveal, ease: "power2.out", scrollTrigger: { trigger: spacer ?? section, start: "top 88%", end: "top 30%", scrub: true } });
  }
  // Solo los momentos largos se fijan (chat, radar, seguimiento, la meta, Axel
  // y medir, cuyo horizonte y fibras se cruzarían en unos píxeles); el
  // resto se revela al pasar. Todo fijado daba un ritmo plano y 28.000 px.
  const tl = gsap.timeline({
    defaults: { ease: "power2.out", duration: 1 },
    scrollTrigger: spacer
      ? { trigger: spacer, start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true }
      : { trigger: pass.trigger ?? section, start: pass.start ?? "top 78%", end: pass.end ?? "bottom 62%", scrub: true, invalidateOnRefresh: true },
  });
  if (fits && tl.scrollTrigger) ctx.pins.set(section.dataset.scene ?? "", tl.scrollTrigger);
  return tl;
}

/**
 * Envuelve la escena en su recorrido fijado: un `div.pin-spacer` con la escena
 * `sticky` arriba y, detrás, un relleno de `travel` % del alto de la ventana
 * (lo mismo que el `+=N%` de antes; en `vh`, así sigue a la ventana sin
 * medir). Relleno y no `padding-bottom`: el sticky solo se mueve dentro de la
 * caja de contenido de su contenedor, y el padding no cuenta. El contexto de
 * gsap lo deshace al revertir.
 */
function stick(section: HTMLElement, travel: number): HTMLElement {
  const spacer = document.createElement("div");
  spacer.className = "pin-spacer film-stick";
  const fill = document.createElement("div");
  fill.setAttribute("aria-hidden", "true");
  fill.style.height = `${Math.round(travel)}vh`;
  section.before(spacer);
  spacer.append(section, fill);
  section.style.position = "sticky";
  section.style.top = "0px";
  gsap.context()?.add(() => () => {
    section.style.removeProperty("position");
    section.style.removeProperty("top");
    if (spacer.parentNode) {
      spacer.before(section);
      spacer.remove();
    }
  });
  return spacer;
}

/**
 * La franja pegada de móvil (piloto, meta): sin pin de GSAP, la escena mide
 * varias pantallas (`data-stick`, film.css) y su `.film-strip` (titular, mapa
 * y panel) va `sticky`. Su `top` se mide al construir y al cambiar de tamaño,
 * no por frame: `top` (el mapa) y `bottom` (el panel) quedan centrados en la
 * ventana y, si no caben, el panel entero abajo; el titular sale por arriba.
 * Devuelve el pase (de cuando se pega a cuando la escena la suelta) o `null`
 * en escritorio. Sin motor o con movimiento reducido no hay `data-stick`: la
 * escena conserva su alto y su fotograma final.
 */
export function stickyStrip(section: HTMLElement, ctx: Ctx, parts: { top: string; bottom: string }): Pass | null {
  const strip = ctx.desktop ? null : section.querySelector<HTMLElement>(".film-strip");
  if (!strip) return null;
  let top = 0;
  // La variante del nicho que se ve: las escenas traen las cuatro en el HTML
  // y las ocultas miden 0 (con la primera, la meta se centraba mal).
  const shown = (sel: string) => all(strip, sel).find((el) => el.getClientRects().length > 0);
  const place = () => {
    const a = shown(parts.top);
    const b = shown(parts.bottom);
    if (!a || !b) return;
    // Con rects y no offsetTop: pegada, la franja es el offsetParent de lo de dentro.
    const s = strip.getBoundingClientRect();
    const t = a.getBoundingClientRect();
    const head = t.top - s.top;
    const body = b.getBoundingClientRect().bottom - t.top;
    const vh = window.innerHeight;
    top = Math.round(Math.min((vh - body) / 2, vh - 8 - body) - head);
    section.style.setProperty("--strip-top", `${top}px`);
  };
  section.setAttribute("data-stick", "");
  place();
  window.addEventListener("resize", place);
  gsap.context()?.add(() => () => {
    window.removeEventListener("resize", place);
    section.removeAttribute("data-stick");
    section.style.removeProperty("--strip-top");
  });
  const pad = () => parseFloat(getComputedStyle(section).paddingTop) || 0;
  return {
    // Se pega cuando el borde de la escena (más su padding) llega a `top`; la
    // suelta cuando el fondo de su contenido llega al fondo de la franja.
    start: () => `top ${top - pad()}px`,
    end: () => `bottom ${top + strip.offsetHeight + pad()}px`,
  };
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
