/**
 * La meta (plan §16.1): siempre fijada en escritorio, con la línea de
 * `sceneTimeline` (si no cabe, se escala) y, en móvil, con la franja pegada.
 *
 * Por frame solo se escriben: el `transform` del plano, el `stroke-dasharray`
 * de las capas de la ruta, el `transform`/`opacity` de unas diez marcas y,
 * cuando cambian, las cifras. Todo sale de `goalFrame(p)`, la misma función
 * que pintó el fotograma final en el servidor; nada se mide en el DOM.
 */
import { gsap } from "gsap";

import { goalFrame } from "@/modules/landing/domain/film/goal-camera";
import { formatMillions, formatPercent, ROUTE_FRACTIONS } from "@/modules/landing/domain/film/route-scenario";
import { SPAN, all, sceneTimeline, setText, stickyStrip, visible, writer, type Scene } from "@/modules/landing/ui/film/engine/film-kit";

const px = (v: number) => v.toFixed(1);
const o = (v: number) => v.toFixed(3);

export const goal: Scene = (section, ctx) => {
  // Siempre fijada en escritorio (si no cabe, se escala) y, en móvil, con la
  // franja pegada: la animación corre solo con la escena encuadrada, continua,
  // y acaba al soltarse (la dueña, 2026-10-01). 480 y no 200: el recorrido largo
  // es el que deja leer la ruta, la proyección y la aprobación.
  const strip = stickyStrip(section, ctx, { top: ".film-goal-map", bottom: ".film-goal-panel" });
  const tl = sceneTimeline(section, ctx, 480, strip ?? undefined);
  const { write: set, restore } = writer();
  const approvedAtStart = section.hasAttribute("data-approved");
  // Al revertir el contexto del motor (parar, cambiar de media o de nicho), la
  // escena vuelve a su HTML: estilos y textos del fotograma final.
  const texts = new Map<HTMLElement, string>();
  // Lo que no depende del nicho, una vez; lo que sí, solo la variante visible.
  const one = (sel: string) => all(section, sel) as (HTMLElement | SVGElement)[];
  const mine = (sel: string) => visible(section, sel);

  const plane = one("[data-anim=goal-plane]");
  const done = one("[data-anim=goal-done]");
  const axi = one("[data-anim=goal-axi]");
  const axiGlow = one("[data-anim=goal-axi-glow]");
  const slow = one("[data-anim=goal-slow]");
  const projection = one("[data-anim=goal-projection]");
  const projectionLine = one("[data-anim=goal-projection-line]");
  const start = one("[data-anim=goal-start]");

  const should = mine("[data-anim=goal-should]");
  const ring = mine("[data-anim=goal-ring]");
  const flag = mine("[data-anim=goal-flag]");
  const car = mine("[data-anim=goal-car]");
  const pulse = mine("[data-anim=goal-pulse]");
  const carHeading = mine("[data-anim=goal-heading]");
  const here = mine("[data-anim=goal-here]");
  const recalc = mine("[data-anim=goal-recalc]");
  const slowChip = mine("[data-anim=goal-slow-chip]");
  const bar = mine("[data-anim=goal-bar]");
  const barSlow = mine("[data-anim=goal-bar-slow]");
  const barRing = mine("[data-anim=goal-bar-ring]");
  const routeNow = mine("[data-anim=goal-route-now]");
  const routeAxi = mine("[data-anim=goal-route-axi]");
  const approve = mine("[data-anim=goal-approve]");
  const hereValues = mine("[data-anim=goal-here-value]");
  const reached = mine("[data-anim=goal-reached]");
  const arrivePct = mine("[data-anim=goal-arrive-pct]");
  const arriveValues = mine("[data-anim=goal-arrive-value]");

  for (const el of [...hereValues, ...reached, ...arrivePct, ...arriveValues]) texts.set(el, el.textContent ?? "");
  gsap.context()?.add(() => () => {
    restore();
    for (const [el, text] of texts) setText(el, text);
    section.toggleAttribute("data-approved", approvedAtStart);
  });

  const at = (pt: { x: number; y: number }) => `translate(${px(pt.x)}px, ${px(pt.y)}px)`;
  const slowSpan = ROUTE_FRACTIONS.expected - ROUTE_FRACTIONS.done;
  let approved: boolean | null = null;

  const paint = (p: number) => {
    const f = goalFrame(p);
    set(plane, "transform", f.plane);
    set(done, "strokeDasharray", f.dash.done);
    set(done, "opacity", o(f.doneLine));
    set(axi, "strokeDasharray", f.dash.axi);
    set(axi, "opacity", o(f.axiLine));
    set(axiGlow, "strokeDasharray", f.dash.axi);
    set(axiGlow, "opacity", o(f.axiGlow * f.axiLine));
    set(slow, "strokeDasharray", f.dash.slow);
    set(projection, "strokeDasharray", f.dash.projection);
    set(projectionLine, "opacity", o(f.projection));

    // El titular y el panel no se escriben: entran con el `reveal` de sceneTimeline.

    set(start, "transform", at(f.marks.start));
    set(start, "opacity", o(f.start));
    set(should, "transform", at(f.marks.should));
    set(should, "opacity", o(f.should));
    set(ring, "transform", at(f.marks.ring));
    set(ring, "opacity", o(f.ring));
    set(flag, "transform", at(f.marks.flag));
    set(flag, "opacity", o(f.flag));
    set(car, "transform", at(f.marks.car));
    set(car, "opacity", o(f.carMark));
    set(pulse, "transform", `scale(${f.pulse.toFixed(3)})`);
    set(carHeading, "transform", `rotate(${f.carHeading.toFixed(1)}deg)`);
    set(here, "opacity", o(f.here));
    set(recalc, "opacity", o(f.recalc));

    set(slowChip, "opacity", o(f.slowChip));
    set(bar, "transform", `scaleX(${f.car.toFixed(4)})`);
    set(barSlow, "transform", `scaleX(${(f.barSlow / slowSpan).toFixed(4)})`);
    set(barRing, "transform", `translateX(${(f.arrive * 100).toFixed(2)}%)`);
    set(barRing, "opacity", o(f.ring));
    set(routeNow, "opacity", o(f.routeNow));
    set(routeAxi, "opacity", o(f.routeAxi));
    set(approve, "transform", `scale(${f.button.toFixed(3)})`);

    for (const el of hereValues) setText(el, `${formatMillions(Number(el.dataset.goal) * f.car)} · ${formatPercent(f.car)}`);
    for (const el of reached) setText(el, formatMillions(Number(el.dataset.goal) * f.car));
    for (const el of arrivePct) setText(el, formatPercent(f.arrive));
    for (const el of arriveValues) setText(el, formatMillions(Number(el.dataset.goal) * f.arrive));

    // Propone (violeta) o aprobado (blanco): un atributo, solo al cruzar.
    if (f.approved !== approved) {
      approved = f.approved;
      section.toggleAttribute("data-approved", approved);
    }
  };

  const progress = { p: 0 };
  paint(0);
  tl.fromTo(progress, { p: 0 }, { p: 1, ease: "none", duration: SPAN, onUpdate: () => paint(progress.p) }, 0);
};
