/**
 * El motor de la película: Lenis (scroll suave) + GSAP ScrollTrigger (escenas
 * fijadas y reproducidas por el scroll).
 *
 * Es el ÚNICO módulo que importa gsap y lenis (verja de ESLint) y solo lo
 * carga `FilmRoot` con `import()`, después del primer frame y nunca con
 * movimiento reducido. Todo lo que hace es de ida y vuelta: `stop()` revierte
 * cada tween, quita los pins y deja el DOM en su fotograma final.
 *
 * Reglas de la coreografía (DESIGN-SYSTEM §6):
 * - Solo `transform`, `opacity` y el trazo de SVG. Nada de loops: todo va
 *   ligado al scroll y se detiene cuando el visitante se detiene.
 * - Los tweens son `from`: el HTML ya está en su estado final, el motor solo
 *   decide desde dónde llega cada cosa.
 * - Una escena se fija (pin) solo si cabe entera en la pantalla. Si no cabe
 *   (móvil, portátil bajo) se revela al pasar, sin fijarla: fijar algo más alto
 *   que la ventana corta su final.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import { formatMillions, formatPesos } from "@/modules/landing/domain/film/route-scenario";
import { FILM_THREAD } from "@/modules/landing/domain/film/thread-path";
import type { FilmThread } from "@/modules/landing/ui/film/thread/thread";
import { close } from "@/modules/landing/ui/film/engine/close-scene";
import { goal } from "@/modules/landing/ui/film/engine/goal-scene";
import { pricing } from "@/modules/landing/ui/film/engine/pricing-scene";
import { call, photo, team, vault } from "@/modules/landing/ui/film/engine/sell-scenes";
import {
  SPAN,
  all,
  atP,
  counter,
  easeOut3,
  lerp,
  num,
  perNiche,
  sceneTimeline,
  segP,
  setText,
  showIn,
  spanTimeline,
  visible,
  type Ctx,
  type Scene,
} from "@/modules/landing/ui/film/engine/film-kit";

export type FilmEngine = { stop(): void; scrollTo(target: string): void; setNiche(): void };

/* ─────────────────────────────── escenas ─────────────────────────────── */

const hero: Scene = (section) => {
  // Al bajar, el texto se despide hacia arriba y el nudo (HeroFibers) baja y se apaga.
  const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true } });
  // Plan §14: el texto sube 140 px y se apaga hacia 0,6; las cifras, hacia
  // 0,45; el halo se va con el nudo (las fibras las recoge su propio canvas).
  tl.to(visible(section, "[data-anim=copy]"), { y: -140, opacity: 0, ease: "none", duration: 0.6 }, 0);
  tl.to(visible(section, "[data-anim=stats]"), { y: -80, opacity: 0, ease: "none", duration: 0.45 }, 0);
  tl.to(visible(section, "[data-anim=halo]"), { opacity: 0, ease: "none", duration: 1 }, 0);
};

/* ─────────────────────────── captar (plan §13) ─────────────────────────── */

/** Nicho: las cuatro llegan desde el fondo en arco y la elegida viene al frente. */
const niche: Scene = (section, ctx) => {
  const tl = spanTimeline(section, ctx, 70);
  visible(section, "[data-anim=notif]").forEach((el, i) => {
    tl.fromTo(
      el,
      { opacity: 0, y: -40, z: ctx.desktop ? -320 : 0 },
      { opacity: 1, y: 0, z: 0, ease: "power3.out", duration: atP(0.26) },
      atP(0.04 + i * 0.08),
    );
  });
  const row = visible(section, "[data-anim=notifs]");
  if (row.length) tl.fromTo(row, { "--choose": 0 }, { "--choose": 1, ease: "power3.out", duration: atP(0.24) }, atP(0.5));
  showIn(tl, visible(section, "[data-anim=niche-hint]"), 0.8, 0.95, 8);
};

/** Radar: el barrido da dos vueltas, aparecen los hallazgos, el objetivo y la ficha. */
const radar: Scene = (section, ctx) => {
  const tl = spanTimeline(section, ctx, 140);
  // El barrido: 720° en 0–0,6 (empieza en 20°). Cada punto aparece cuando lo pasa.
  const sweep = visible(section, "[data-anim=sweep]");
  if (sweep.length) {
    tl.fromTo(sweep, { rotation: 20, opacity: 1 }, { rotation: 740, ease: "none", duration: atP(0.6) }, 0);
    tl.to(sweep, { opacity: 0.5, duration: atP(0.02) }, atP(0.96));
  }
  for (const dot of visible(section, "[data-anim=dot]")) {
    // Ángulo del punto medido desde arriba (de donde parte el barrido cónico).
    const fromTop = (num(dot, "angle") + 90) % 360;
    tl.fromTo(dot, { opacity: 0 }, { opacity: num(dot, "strength"), ease: "none", duration: atP(0.01) }, atP((0.6 * fromTop) / 720));
  }
  visible(section, "[data-anim=hit]").forEach((el, i) => showIn(tl, [el], 0.28 + i * 0.06, 0.36 + i * 0.06, 0));
  const target = visible(section, "[data-anim=target]");
  if (target.length) tl.fromTo(target, { opacity: 0, scale: 2.4 }, { opacity: 1, scale: 1, ease: "power3.out", duration: atP(0.08) }, atP(0.48));
  const leader = visible(section, "[data-anim=leader]");
  if (leader.length) tl.fromTo(leader, { strokeDasharray: "0 2" }, { strokeDasharray: "1 2", ease: "power3.out", duration: atP(0.1) }, atP(0.55));
  const cards = visible(section, "[data-anim=lead]");
  if (cards.length) tl.fromTo(cards, { opacity: 0, x: 30 }, { opacity: 1, x: 0, ease: "power3.out", duration: atP(0.18) }, atP(0.6));
  const scores = visible(section, "[data-anim=score]");
  counter(tl, 0.65, 0.85, (v) => {
    for (const el of scores) setText(el, String(Math.round(num(el, "to") * v)));
  });
  const axes = visible(section, "[data-anim=axis]");
  if (axes.length) tl.fromTo(axes, { scaleX: 0 }, { scaleX: 1, ease: "power3.out", duration: atP(0.2) }, atP(0.7));
  showIn(tl, visible(section, "[data-anim=radar-sources]"), 0.82, 0.95, 6);
};

/**
 * Seguimiento: la regla se traza de arriba abajo con el progreso (de 0 a 0,9) y
 * cada evento aparece cuando la regla llega a su altura. La mañana se aclara.
 */
const RULER_H = 660;
const followup: Scene = (section, ctx) => {
  const tl = spanTimeline(section, ctx, 130);
  const lines = visible(section, "[data-anim=ruler-line]");
  if (lines.length) tl.fromTo(lines, { scaleY: 0 }, { scaleY: 1, ease: "none", duration: atP(0.9) }, 0);
  for (const el of visible(section, "[data-anim=ruler-event]")) {
    const at = (0.9 * Math.max(0, num(el, "y") - 10)) / RULER_H;
    showIn(tl, [el], at, Math.min(1, at + 0.06), 10);
  }
  const morning = visible(section, "[data-anim=morning]");
  if (morning.length) tl.fromTo(morning, { opacity: 0.1 }, { opacity: 1, ease: "power3.out", duration: atP(0.6) }, atP(0.3));
};

/**
 * La escena del chat, con los tiempos del lienzo «Teléfono premium» (`p` de 0 a
 * 1 sobre `CHAT` unidades de línea): el teléfono entra girado y se endereza
 * mientras Axi escribe, el reflejo cruza el cristal y la venta sale de la
 * pantalla. Los turnos traen su `data-at` desde el HTML.
 */
const CHAT = 10;
const chatAt = (p: number) => p * CHAT;
const FEED_GAP = 7; // el `gap` de .film-phone-feed

const chat: Scene = (section, ctx) => {
  // Sin fijar (móvil y pantallas bajas; §13: no se fija lo que no cabe), la
  // escena sigue al TELÉFONO: empieza con su pantalla ya a la vista y acaba
  // cuando su borde superior pasa bajo la cabecera, así «escribiendo…» y la
  // venta ocurren con el teléfono entero en pantalla.
  const tl = sceneTimeline(section, ctx, 180, { trigger: section.querySelector(".film-phone") ?? section, start: "top 42%", end: "top 64px" });
  tl.to({}, { duration: 0 }, CHAT); // la línea dura CHAT aunque el último turno acabe antes

  const one = (sel: string) => section.querySelector<HTMLElement>(sel);
  const phone = one("[data-anim=phone]");
  if (phone) {
    const out = { ease: "power3.out", immediateRender: false };
    tl.fromTo(phone, { "--rx": "14deg", "--ry": "-30deg", "--rz": "3deg", "--ty": "34px", "--tz": "-60px" }, { ...out, "--rx": "7deg", "--ry": "-16deg", "--rz": "1deg", "--ty": "0px", "--tz": "0px", duration: chatAt(0.55) }, 0);
    tl.fromTo(phone, { "--rx": "7deg", "--ry": "-16deg" }, { ...out, "--rx": "9deg", "--ry": "-20deg", duration: chatAt(0.2) }, chatAt(0.8));
    gsap.set(phone, { "--rx": "14deg", "--ry": "-30deg", "--rz": "3deg", "--ty": "34px", "--tz": "-60px" });
  }
  const floor = one("[data-anim=phone-floor]");
  if (floor) tl.fromTo(floor, { opacity: 0.55, scaleX: 0.85 }, { opacity: 0.9, scaleX: 1, ease: "power3.out", duration: chatAt(0.55) }, 0);
  const glare = one("[data-anim=glare]");
  if (glare) tl.fromTo(glare, { xPercent: -40 }, { xPercent: 70, ease: "none", duration: CHAT }, 0);

  // Los turnos: los cuatro nichos con los mismos tiempos.
  for (const group of perNiche(section, "[data-anim=msg]")) {
    for (const msg of group) {
      tl.from(msg, { opacity: 0, y: 12, scale: 0.97, duration: chatAt(0.05) }, chatAt(Number(msg.dataset.at ?? 0)));
    }
  }

  // «Escribiendo…», entre la pregunta del pago y la respuesta.
  const typing = one("[data-anim=typing]");
  const TYPING = [0.54, 0.6] as const;
  if (typing) {
    tl.fromTo(typing, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: chatAt(0.03) }, chatAt(TYPING[0]));
    tl.to(typing, { opacity: 0, duration: chatAt(0.02) }, chatAt(TYPING[1]));
  }
  const online = one("[data-anim=status-online]");
  const writing = one("[data-anim=status-typing]");
  if (online && writing) {
    tl.to(online, { opacity: 0, duration: chatAt(0.02) }, chatAt(TYPING[0]));
    tl.fromTo(writing, { opacity: 0 }, { opacity: 1, duration: chatAt(0.02) }, chatAt(TYPING[0]));
    tl.to(writing, { opacity: 0, duration: chatAt(0.02) }, chatAt(TYPING[1]));
    tl.to(online, { opacity: 1, duration: chatAt(0.02) }, chatAt(TYPING[1]));
  }

  // El hilo baja lo que miden los turnos que aún no llegan: cada mensaje nuevo
  // entra abajo y empuja a los anteriores. Se mide al construir y en cada
  // refresh (layout, nunca por frame); los nichos ocultos no miden.
  const feed = one("[data-anim=feed]");
  if (feed) {
    const shown = () => all(feed, "[data-anim=msg]").filter((m) => m.offsetParent !== null);
    const bottom = (m: HTMLElement) => m.offsetTop + m.offsetHeight;
    const lift = (k: number, extra = 0) => () => {
      const msgs = shown();
      if (!msgs.length) return 0;
      const end = bottom(msgs[msgs.length - 1]);
      const ref = k < 0 ? msgs[0].offsetTop - FEED_GAP : bottom(msgs[Math.min(k, msgs.length - 1)]);
      return Math.max(0, end - ref - extra);
    };
    const times = (perNiche(section, "[data-anim=msg]")[0] ?? []).map((m) => Number(m.dataset.at ?? 0));
    const move = { ease: "power2.out", duration: chatAt(0.05) };
    tl.fromTo(feed, { y: lift(-1) }, { ...move, y: lift(0) }, chatAt(times[0] ?? 0));
    times.forEach((t, k) => {
      if (k === 0) return;
      // Mientras Axi escribe, el turno anterior sube lo que ocupa la burbuja de «escribiendo…».
      if (typing && t > TYPING[0] && times[k - 1] < TYPING[0]) {
        tl.to(feed, { ...move, y: lift(k - 1, typing.offsetHeight + FEED_GAP) }, chatAt(TYPING[0]));
      }
      tl.to(feed, { ...move, y: lift(k) }, chatAt(t));
    });
  }

  for (const group of perNiche(section, "[data-anim=sale]")) {
    tl.fromTo(group, { opacity: 0, z: 30, y: 24 }, { opacity: 1, z: 100, y: 0, ease: "power3.out", duration: chatAt(0.14) }, chatAt(0.84));
  }
};

/* ─────────────────────────── crecer (plan §11) ─────────────────────────── */


/** Cobrar: el recibo entra, se llena el último pago, se sella y sale el PDF. */
const collect: Scene = (section, ctx) => {
  const tl = spanTimeline(section, ctx, 130);
  showIn(tl, visible(section, "[data-anim=cobro-msg]"), 0.04, 0.16);
  showIn(tl, visible(section, "[data-anim=cobro-reply]"), 0.22, 0.34);
  showIn(tl, visible(section, "[data-anim=cobro-promise]"), 0.36, 0.46);

  const paper = visible(section, "[data-anim=receipt]");
  const [rx0, rz0, rx1, rz1] = ctx.desktop ? [44, -2, 26, -6] : [34, -1, 20, -4];
  if (paper.length) {
    tl.fromTo(
      paper,
      { "--ty": "70px", "--rx": `${rx0}deg`, "--rz": `${rz0}deg` },
      { "--ty": "0px", "--rx": `${rx1}deg`, "--rz": `${rz1}deg`, ease: "power3.out", duration: atP(0.6) },
      0,
    );
    tl.fromTo(paper, { opacity: 0.25 }, { opacity: 1, ease: "none", duration: atP(0.2) }, 0);
  }
  const shadow = visible(section, "[data-anim=receipt-shadow]");
  if (shadow.length) tl.fromTo(shadow, { opacity: 0.4 }, { opacity: 0.95, ease: "power3.out", duration: atP(0.6) }, 0);

  // El último pago: se llena la barra y cuentan «Total pagado» y «Falta».
  const fill = visible(section, "[data-anim=receipt-fill]");
  if (fill.length) tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, ease: "power3.out", duration: atP(0.25) }, atP(0.55));
  const paid = visible(section, "[data-anim=receipt-paid]");
  const left = visible(section, "[data-anim=receipt-left]");
  const status = visible(section, "[data-anim=receipt-status]");
  const verified = visible(section, "[data-anim=receipt-verified]");
  const finals = verified.map((el) => num(el, "final"));
  counter(tl, 0.55, 0.8, (v) => {
    for (const el of paid) setText(el, formatPesos(lerp(num(el, "from"), num(el, "to"), v)));
    for (const el of left) setText(el, formatPesos(num(el, "from") * (1 - v)));
    const done = v >= 0.999;
    for (const el of status) setText(el, (done ? el.dataset.paid : el.dataset.due) ?? "");
    verified.forEach((el, i) => setText(el, String(done ? finals[i] : finals[i] - 1)));
  });

  const stamp = visible(section, "[data-anim=receipt-stamp]");
  if (stamp.length) {
    tl.fromTo(stamp, { opacity: 0, scale: 1.5, rotation: -9 }, { opacity: 0.88, scale: 1, rotation: -9, ease: "power3.out", duration: atP(0.1) }, atP(0.82));
  }
  const gloss = visible(section, "[data-anim=receipt-gloss]");
  if (gloss.length) tl.fromTo(gloss, { xPercent: -60 }, { xPercent: 60, ease: "none", duration: SPAN }, 0);
  showIn(tl, visible(section, "[data-anim=receipt-sent]"), 0.92, 1, 10);
};

/** Ordenar: la tarjeta se levanta de «Propuesta», vuela y aterriza en «Compromiso». */
const pipeline: Scene = (section, ctx) => {
  const tl = spanTimeline(section, ctx, 120);
  const forecast = visible(section, "[data-anim=forecast]");
  counter(tl, 0, 0.5, (v) => {
    for (const el of forecast) setText(el, formatMillions(num(el, "to") * v));
  });
  const plane = visible(section, "[data-anim=board-plane]");
  if (plane.length) tl.fromTo(plane, { opacity: 0.3 }, { opacity: 1, ease: "power3.out", duration: atP(0.3) }, 0);

  if (!ctx.desktop) {
    showIn(tl, visible(section, "[data-anim=deal-mobile]"), 0.2, 0.5, 30);
    showIn(tl, visible(section, "[data-anim=appointment-mobile]"), 0.6, 0.8);
    return;
  }

  // La tarjeta vuela en coordenadas del tablero (820 × 600): del hueco de
  // «Propuesta» (542, 250) al de «Compromiso» (672, 240), con un arco de 70 px.
  // En el HTML ya está aterrizada; aquí solo se mueve la diferencia.
  const START = { x: 542, y: 250 };
  const END = { x: 672, y: 240 };
  const cards = visible(section, "[data-anim=deal]");
  const shadows = visible(section, "[data-anim=deal-shadow]");
  const countLeft = visible(section, "[data-anim=count-left]");
  const countLanded = visible(section, "[data-anim=count-landed]");
  // Los finales salen de `data-to`, no del texto: al rehacer la línea (otro
  // nicho) el texto puede haber quedado a medias.
  const finalsLeft = countLeft.map((el) => num(el, "to"));
  const finalsLanded = countLanded.map((el) => num(el, "to"));
  const setCard = cards.map((el) => ({ x: gsap.quickSetter(el, "x", "px"), y: gsap.quickSetter(el, "y", "px"), r: gsap.quickSetter(el, "rotation", "deg"), o: gsap.quickSetter(el, "opacity") }));
  const setShadow = shadows.map((el) => ({ x: gsap.quickSetter(el, "x", "px"), y: gsap.quickSetter(el, "y", "px"), s: gsap.quickSetter(el, "scale"), o: gsap.quickSetter(el, "opacity") }));
  const fly = (p: number) => {
    const lift = Math.sin(Math.PI * segP(p, 0.2, 0.74));
    const move = easeOut3(segP(p, 0.3, 0.66));
    const x = lerp(START.x, END.x, move) - END.x;
    const ground = lerp(START.y, END.y, move) - END.y;
    const appear = segP(p, 0.02, 0.14);
    for (const c of setCard) {
      c.x(x);
      c.y(ground - 70 * lift);
      c.r(-3 * lift);
      c.o(appear);
    }
    for (const sh of setShadow) {
      sh.x(x);
      sh.y(ground);
      sh.s(1 + 0.35 * lift);
      sh.o((0.9 - 0.45 * lift) * appear);
    }
    countLeft.forEach((el, i) => setText(el, String(move > 0.5 ? finalsLeft[i] : num(el, "from"))));
    countLanded.forEach((el, i) => setText(el, String(p >= 0.72 ? finalsLanded[i] : num(el, "from"))));
  };
  counter(tl, 0, 1, fly, "none");

  const leaving = visible(section, "[data-anim=board-leaving]");
  if (leaving.length) tl.fromTo(leaving, { opacity: 1 }, { opacity: 0, ease: "none", duration: atP(0.1) }, atP(0.22));
  showIn(tl, visible(section, "[data-anim=appointment]"), 0.76, 0.9);
};

/** Axel escribe su resumen, amanece sobre el horizonte y suben sus propuestas. */
const axel: Scene = (section, ctx) => {
  const tl = spanTimeline(section, ctx, 140);
  const typed = visible(section, "[data-anim=axel-typed]");
  const rest = visible(section, "[data-anim=axel-rest]");
  const carets = visible(section, "[data-anim=axel-caret]");
  const texts = visible(section, "[data-anim=axel-summary]").map((el) => el.dataset.text ?? "");
  const type = (v: number) => {
    typed.forEach((el, i) => {
      const text = texts[i] ?? "";
      const n = Math.round(text.length * v);
      setText(el, text.slice(0, n));
      if (rest[i]) setText(rest[i], text.slice(n));
      if (carets[i]) carets[i].style.opacity = n < text.length && v > 0 ? "1" : "0";
    });
  };
  counter(tl, 0.1, 0.46, type, "none");
  showIn(tl, visible(section, "[data-anim=axel-chips]"), 0.44, 0.52, 8);

  const horizon = visible(section, "[data-anim=axel-horizon]");
  if (horizon.length) tl.fromTo(horizon, { scaleX: 0 }, { scaleX: 1, ease: "power2.inOut", duration: atP(0.45) }, atP(0.3));
  const dawn = visible(section, "[data-anim=axel-dawn]");
  if (dawn.length) tl.fromTo(dawn, { y: 270, opacity: 0.15 }, { y: 0, opacity: 1, ease: "power3.out", duration: atP(0.35) }, atP(0.45));
  visible(section, "[data-anim=axel-proposal]").forEach((el, i) => showIn(tl, [el], 0.52 + i * 0.08, 0.72 + i * 0.08, 40));
  showIn(tl, visible(section, "[data-anim=axel-foot]"), 0.9, 1, 6);
};

/** Medir: las fibras se revelan de izquierda a derecha y cuentan las puertas; al final, lo producido. */
const measure: Scene = (section, ctx) => {
  const tl = spanTimeline(section, ctx, 140);
  const funnels = visible(section, ".film-funnel").map((box) => {
    const rect = box.querySelector<SVGRectElement>("[data-anim=funnel-clip]");
    const x0 = Number(rect?.getAttribute("x") ?? 0);
    const full = Number(rect?.getAttribute("width") ?? 0);
    const from = Number(rect?.dataset.from ?? 0);
    const gates = all(box, "[data-anim=funnel-gate]").map((g) => ({
      x: num(g, "x"),
      line: g.querySelector<HTMLElement>(".film-funnel-line"),
      label: g.querySelector<HTMLElement>(".film-funnel-label"),
      count: g.querySelector<HTMLElement>("[data-anim=funnel-count]"),
    }));
    return { rect, x0, full, from, gates };
  });
  counter(tl, 0.12, 0.82, (v) => {
    for (const f of funnels) {
      const width = lerp(f.from, f.full, v);
      f.rect?.setAttribute("width", width.toFixed(1));
      const edge = f.x0 + width;
      for (const g of f.gates) {
        const on = segP(edge, g.x - 40 * (f.full / 1200), g.x + 60 * (f.full / 1200));
        if (g.line) g.line.style.opacity = (0.3 + 0.7 * on).toFixed(2);
        if (g.label) g.label.style.opacity = (0.25 + 0.75 * on).toFixed(2);
        if (g.count) setText(g.count, Math.round(num(g.count, "to") * easeOut3(on)).toLocaleString("es-CO"));
      }
    }
  });
  const produced = visible(section, "[data-anim=measure-produced]");
  counter(tl, 0.82, 0.96, (v) => {
    for (const el of produced) setText(el, formatMillions(num(el, "to") * v));
  });
  const result = visible(section, "[data-anim=measure-result]");
  if (result.length) tl.fromTo(result, { opacity: 0.2 }, { opacity: 1, ease: "power3.out", duration: atP(0.14) }, atP(0.82));
  const glow = visible(section, "[data-anim=funnel-glow]");
  if (glow.length) tl.fromTo(glow, { opacity: 0 }, { opacity: 1, ease: "power3.out", duration: atP(0.14) }, atP(0.82));
};

const SCENES: Record<string, Scene> = { hero, niche, radar, followup, chat, photo, call, vault, team, collect, pipeline, goal, axel, measure, pricing, close };

/* ──────────────────────────────── arranque ──────────────────────────────── */

export function startFilm(root: HTMLElement): FilmEngine {
  gsap.registerPlugin(ScrollTrigger);
  // En móvil la barra del navegador aparece y desaparece: no es un resize.
  ScrollTrigger.config({ ignoreMobileResize: true });

  // La capa pública no hace scroll en `window` sino en `[data-app-scroll]`
  // (layout público): Lenis y ScrollTrigger apuntan a ese contenedor.
  const scroller = document.querySelector<HTMLElement>("[data-app-scroll]");
  const lenis = new Lenis(
    scroller
      ? { wrapper: scroller, content: scroller.querySelector<HTMLElement>("main") ?? scroller, lerp: 0.1 }
      : { lerp: 0.1 },
  );
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  // Pins `fixed` y no `transform` (el defecto con un contenedor propio): el
  // contenedor ocupa la ventana desde (0, 0) sin transformaciones encima, así
  // que fijar con `position: fixed` es exacto y no va un frame por detrás del
  // scroll nativo en táctil. Es lo que pedía «scroll en window» (§12) sin
  // tocar el layout público, que comparten /productos y el resto.
  if (scroller) ScrollTrigger.defaults({ scroller, pinType: "fixed" });

  // Los pins de la media activa; al cruzar el corte se rehacen (matchMedia).
  // Las escenas se construyen para el nicho visible; `setNiche` las rehace.
  const pins = new Map<string, ScrollTrigger>();
  const desktopQuery = window.matchMedia("(min-width: 1024px)");
  const mount = () => {
    const media = gsap.matchMedia(root);
    media.add({ desktop: "(min-width: 1024px)", mobile: "(max-width: 1023px)" }, (context) => {
      const ctx: Ctx = { desktop: Boolean(context.conditions?.desktop), pins };
      for (const section of all(root, "[data-scene]")) {
        const build = SCENES[section.dataset.scene ?? ""];
        if (build) build(section, ctx);
      }
      return () => pins.clear();
    });
    return media;
  };
  let mm = mount();

  ScrollTrigger.refresh();

  // El hilo de luz, archivado por la dueña (plan §15): con `enabled: false` su
  // módulo (renderer WebGL incluido) ni se descarga. Encendido, llega después
  // de los pins, mide las escenas ya fijadas en cada refresh y dibuja en el
  // ticker de gsap (en reposo no hace nada).
  let thread: FilmThread | null = null;
  let stopped = false;
  if (FILM_THREAD.enabled) {
    void import("@/modules/landing/ui/film/thread/thread").then(({ createThread }) => {
      if (stopped) return;
      thread = createThread({
        root,
        // El número de Lenis, no `scrollTop`: leerlo en el ticker, después de
        // que gsap escribió estilos, forzaría un layout en cada frame.
        getScroll: () => lenis.scroll,
        getPin: (scene) => {
          const st = pins.get(scene);
          return st ? { start: st.start, end: st.end } : null;
        },
        isDesktop: () => desktopQuery.matches,
      });
      ScrollTrigger.addEventListener("refresh", thread.refresh);
      gsap.ticker.add(thread.frame);
      thread.refresh();
    });
  }

  // Las fuentes o las imágenes pueden cambiar alturas después de medir.
  const refresh = () => ScrollTrigger.refresh();
  void document.fonts?.ready.then(refresh);

  return {
    stop() {
      stopped = true;
      if (thread) {
        ScrollTrigger.removeEventListener("refresh", thread.refresh);
        gsap.ticker.remove(thread.frame);
        thread.destroy();
      }
      mm.revert();
      gsap.ticker.remove(tick);
      lenis.destroy();
      if (scroller) ScrollTrigger.defaults({ scroller: window });
    },
    scrollTo(target: string) {
      lenis.scrollTo(target, { duration: 1.4 });
    },
    // Otro nicho: se rehacen las líneas para animar solo la variante visible
    // (el HTML ya trae las cuatro; esto no toca el DOM de las escenas). Mismo
    // scroll, mismos pins: el visitante no nota el cambio de andamio.
    setNiche() {
      mm.revert();
      mm = mount();
      ScrollTrigger.refresh();
    },
  };
}
