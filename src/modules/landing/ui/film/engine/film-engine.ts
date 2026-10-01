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

import { roadPercentAt } from "@/modules/landing/domain/film/route-map";
import { formatMillions, formatPercent, formatPesos, ROUTE_FRACTIONS } from "@/modules/landing/domain/film/route-scenario";
import { FILM_THREAD } from "@/modules/landing/domain/film/thread-path";
import type { FilmThread } from "@/modules/landing/ui/film/thread/thread";
import {
  SPAN,
  all,
  atP,
  counter,
  countUp,
  easeOut3,
  lerp,
  num,
  perNiche,
  reveal,
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

const niche: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 70);
  tl.from(visible(section, "[data-anim=niche]"), { ...reveal, y: 60, stagger: 0.12 }, 0.3);
};

const radar: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 140);
  tl.fromTo(visible(section, "[data-anim=sweep]"), { rotation: 0 }, { rotation: 540, ease: "none", duration: 4 }, 0);
  tl.from(visible(section, "[data-anim=dot]"), { scale: 0, stagger: 0.08, duration: 0.3 }, 0.2);
  tl.from(visible(section, "[data-anim=hit]"), { scale: 0, stagger: 0.3, duration: 0.4 }, 1);
  tl.from(visible(section, "[data-anim=target]"), { scale: 0, duration: 0.4 }, 1.8);
  for (const group of perNiche(section, "[data-anim=lead]")) tl.from(group, { opacity: 0, x: 40 }, 2);
  for (const group of perNiche(section, "[data-anim=axis]")) tl.from(group, { scaleX: 0, transformOrigin: "left", stagger: 0.12 }, 2.4);
  for (const group of perNiche(section, "[data-anim=source]")) tl.from(group, { opacity: 0.15, stagger: 0.25, duration: 0.4 }, 2.6);
  for (const group of perNiche(section, "[data-anim=score]")) for (const el of group) countUp(tl, el, 2.4);
  for (const group of perNiche(section, "[data-anim=decisor]")) tl.from(group, { opacity: 0, y: 16 }, 3.4);
};

const followup: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 130);
  // El tramo horizontal: la línea de tiempo entra desde la derecha mientras la cinta avanza.
  for (const group of perNiche(section, "[data-anim=track]")) {
    if (ctx.desktop) tl.from(group, { xPercent: 35, ease: "none", duration: 3 }, 0);
  }
  for (const group of perNiche(section, "[data-anim=line]")) tl.from(group, { scaleX: 0, transformOrigin: "left", ease: "none", duration: 2.4 }, 0.2);
  for (const group of perNiche(section, "[data-anim=step]")) tl.from(group, { opacity: 0.12, y: 16, stagger: 0.55, duration: 0.5 }, 0.4);
  for (const group of perNiche(section, "[data-anim=msg]")) tl.from(group, { ...reveal, stagger: 0.5 }, 1.4);
  for (const group of perNiche(section, "[data-anim=result]")) tl.from(group, { opacity: 0, scale: 0.94 }, 2.6);
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

const photo: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 120);
  for (const group of perNiche(section, "[data-anim=shot]")) tl.from(group, { opacity: 0, x: -40 }, 0.2);
  for (const group of perNiche(section, "[data-anim=scan]")) tl.fromTo(group, { y: -90 }, { y: 70, ease: "none", duration: 1.6 }, 0.6);
  for (const group of perNiche(section, "[data-anim=tile]")) tl.from(group, { opacity: 0.2, stagger: 0.08, duration: 0.4 }, 0.8);
  for (const group of perNiche(section, "[data-anim=match]")) tl.from(group, { scale: 0.9, opacity: 0.4 }, 2);
  for (const group of perNiche(section, "[data-anim=recognized]")) tl.from(group, { opacity: 0, y: 12 }, 2.3);
  for (const group of perNiche(section, "[data-anim=msg]")) tl.from(group, reveal, 2.8);
};

const call: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 130);
  tl.from(visible(section, "[data-anim=aura]"), { scale: 0.8, opacity: 0.4 }, 0);
  for (const group of perNiche(section, "[data-anim=line]")) tl.from(group, { opacity: 0, y: 12, stagger: 0.6, duration: 0.5 }, 0.5);
  tl.from(visible(section, "[data-anim=stage-line]"), { scaleX: 0, transformOrigin: "left", ease: "none", duration: 2.4 }, 0.6);
  tl.from(visible(section, "[data-anim=stage]"), { opacity: 0.2, stagger: 0.4, duration: 0.4 }, 0.6);
  for (const group of perNiche(section, "[data-anim=outcome]")) tl.from(group, { opacity: 0, y: 16 }, 3.2);
};

const vault: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 110);
  tl.from(visible(section, "[data-anim=ring]"), { scale: 0.6, opacity: 0, stagger: 0.15 }, 0.2);
  for (const group of perNiche(section, "[data-anim=msg]")) {
    tl.from(group[0], reveal, 0.6);
    tl.from(group.slice(1), reveal, 2.4);
  }
  tl.from(visible(section, "[data-anim=lock]"), { opacity: 0, y: 16, stagger: 0.3, duration: 0.5 }, 1.2);
};

const team: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 120);
  tl.from(visible(section, "[data-anim=mode]"), { opacity: 0.25, stagger: 0.7, duration: 0.5 }, 0.2);
  for (const group of perNiche(section, "[data-anim=inbox]")) tl.from(group, { opacity: 0, y: 30 }, 0);
  for (const group of perNiche(section, "[data-anim=msg]")) tl.from(group, { ...reveal, stagger: 0.7 }, 0.6);
  for (const group of perNiche(section, "[data-anim=return]")) tl.from(group, { opacity: 0, scale: 0.9 }, 2.8);
};

/**
 * Mueve una marca del mapa a otra fracción de la carretera con `transform`
 * (compositor) y no con `left`/`top` (layout en cada frame). La marca queda
 * anclada en su fracción inicial (`data-fraction`) y se desplaza la diferencia,
 * medida en px del lienzo actual.
 */
/** El tamaño de cada lienzo del mapa, medido una vez por refresh (no por frame). */
let mapBoxes = new WeakMap<HTMLElement, { w: number; h: number }>();
const forgetMapBoxes = () => {
  mapBoxes = new WeakMap();
};

function moveMark(mark: HTMLElement, fraction: number) {
  const canvas = mark.closest<HTMLElement>("[data-anim=map]");
  if (!canvas) return;
  let box = mapBoxes.get(canvas);
  if (!box) mapBoxes.set(canvas, (box = { w: canvas.offsetWidth, h: canvas.offsetHeight }));
  const { w, h } = box;
  const from = roadPercentAt(Number(mark.dataset.fraction ?? 0));
  const to = roadPercentAt(fraction);
  const dx = ((parseFloat(to.left) - parseFloat(from.left)) / 100) * w;
  const dy = ((parseFloat(to.top) - parseFloat(from.top)) / 100) * h;
  gsap.set(mark, { x: dx, y: dy, xPercent: -50, yPercent: -50 });
}

const goal: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 200);
  for (const group of perNiche(section, "[data-anim=navpanel]")) tl.from(group, { opacity: 0, x: ctx.desktop ? 60 : 0, y: ctx.desktop ? 0 : 40 }, 0.2);

  // «Vas aquí» avanza por la carretera: el trazo recorrido y la marca se mueven juntos.
  const roads = visible(section, "[data-anim=road], [data-anim=road-glow]");
  const heres = visible(section, "[data-anim=here]");
  const values = visible(section, "[data-anim=here-value]");
  const progress = { p: 0 };
  const paint = () => {
    const p = progress.p;
    for (const r of roads) r.style.strokeDasharray = `${p} 2`;
    for (const h of heres) moveMark(h, p);
    for (const v of values) setText(v, `${formatMillions(Number(v.dataset.goal) * p)} · ${formatPercent(p)}`);
  };
  tl.fromTo(progress, { p: 0 }, { p: ROUTE_FRACTIONS.done, ease: "power1.inOut", duration: 2.2, onUpdate: paint }, 0.2);

  tl.from(visible(section, "[data-anim=should]"), { opacity: 0, scale: 0.5 }, 2.2);
  tl.from(visible(section, "[data-anim=road-slow], [data-anim=slow]"), { opacity: 0 }, 2.4);
  tl.from(visible(section, "[data-anim=projection]"), { opacity: 0 }, 2.7);
  for (const group of perNiche(section, "[data-anim=step]")) tl.from(group, { opacity: 0.2, x: 12, stagger: 0.2, duration: 0.4 }, 1);

  // Axi propone otra ruta y la llegada sube (82 % → 91 %).
  const projections = visible(section, "[data-anim=projection]");
  const pcts = visible(section, "[data-anim=projection-pct]");
  const pvalues = visible(section, "[data-anim=projection-value]");
  const route = { p: ROUTE_FRACTIONS.projected };
  const paintRoute = () => {
    for (const m of projections) moveMark(m, route.p);
    for (const el of pcts) setText(el, formatPercent(route.p));
    for (const el of pvalues) setText(el, formatMillions(Number(el.dataset.goal) * route.p));
  };
  tl.from(visible(section, "[data-anim=route-axi]"), { opacity: 0.35, scale: 0.97, duration: 0.5 }, 3.2);
  tl.fromTo(route, { p: ROUTE_FRACTIONS.projected }, { p: ROUTE_FRACTIONS.projectedWithRoute, duration: 0.9, onUpdate: paintRoute }, 3.5);
  tl.to({}, { duration: 0.5 });
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

const close: Scene = (section) => {
  const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: "top 85%", end: "top 25%", scrub: true } });
  tl.from(visible(section, "[data-anim=alpha-close]"), { scale: 0.7, opacity: 0, ease: "power2.out" }, 0);
};

const SCENES: Record<string, Scene> = { hero, niche, radar, followup, chat, photo, call, vault, team, collect, pipeline, goal, axel, measure, close };

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
  ScrollTrigger.addEventListener("refreshInit", forgetMapBoxes);

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
      ScrollTrigger.removeEventListener("refreshInit", forgetMapBoxes);
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
