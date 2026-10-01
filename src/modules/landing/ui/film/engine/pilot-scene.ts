/**
 * El piloto automático (plan §19.4): fijado en escritorio con una línea de
 * `sceneTimeline` parecida a la de la meta y el guion de lectura de
 * `pilotStory` (mesetas en cada fijo). Sin pin (móvil, o escritorio donde no
 * cabe) corre de «top 70 %» hasta «bottom bottom», y no hasta «bottom top»: con ese final el aterrizaje
 * (0,82–0,9) ocurría con la escena ya fuera por arriba y en el teléfono nunca
 * se veía «Demo agendada» (QA del 2026-10-01, 390).
 *
 * Por frame solo se escriben: el `transform` del plano, el `stroke-dasharray`
 * de la ruta recorrida y de los relojes, el `transform`/`opacity` de unas
 * quince marcas y, cuando cambian, las cifras, las etapas del tablero y unos
 * atributos (fase de la cabina, estado, fijos encendidos). Todo sale de
 * `pilotFrame(p)`, la misma función que pintó el fotograma final en el
 * servidor; nada se mide en el DOM.
 */
import { gsap } from "gsap";

import { PILOT_COPY, PILOT_LOT, PILOT_RUN, PILOT_STAGES, PILOT_STATUS, lotCounts } from "@/modules/landing/domain/film/pilot-content";
import { PILOT_DIAL_MAX, PILOT_FOCUS, PILOT_OVERVIEW, capSegments, dial, pilotFrame, pilotStory } from "@/modules/landing/domain/film/pilot-frame";
import { SPAN, all, sceneTimeline, stickyStrip, visible, writer, type Scene } from "@/modules/landing/ui/film/engine/film-kit";

const px = (v: number) => v.toFixed(1);
const o = (v: number) => v.toFixed(3);
const pad = (n: number) => String(n).padStart(2, "0");
const at = (pt: { x: number; y: number }) => `translate(${px(pt.x)}px, ${px(pt.y)}px)`;

export const pilot: Scene = (section, ctx) => {
  // 800 y no 320: con las mesetas de `pilotStory` (un alto en cada fijo) son
  // unas seis pantallas y cada paso de la cabina se lee sin scroll fino
  // (dueña, 2026-10-01). Sin pin, el pase empieza con la escena asomando
  // («top 70 %») para que las mesetas tengan recorrido también en el teléfono.
  // En móvil, la franja pegada (stickyStrip) con las mismas mesetas.
  const strip = stickyStrip(section, ctx, { top: ".film-pilot-map", bottom: ".film-pilot-cockpit" });
  const tl = sceneTimeline(section, ctx, 800, strip ?? { start: "top 70%", end: "bottom bottom" });
  const { write: set, flag, text, restore } = writer();
  gsap.context()?.add(() => () => restore());

  const run = { ...PILOT_RUN, approved: lotCounts(PILOT_LOT).approved };
  const C = PILOT_COPY.cockpit;
  // Lo que no depende del nicho, una vez; lo que sí, solo la variante visible.
  const one = (sel: string) => all(section, sel) as (HTMLElement | SVGElement)[];
  const mine = (sel: string) => visible(section, sel);
  const me = [section];

  const plane = one("[data-anim=pilot-plane]");
  const done = one("[data-anim=pilot-done]");
  const zone = one("[data-anim=pilot-zone]");
  const sweep = one("[data-anim=pilot-sweep]");
  const blip = one("[data-anim=pilot-blip]");
  const hold = one("[data-anim=pilot-hold]");
  const fixes = all(section, "[data-anim=pilot-fix]");
  const tower = one("[data-anim=pilot-tower]");
  const airport = one("[data-anim=pilot-airport]");
  const airportLabel = one("[data-anim=pilot-airport-label]");
  const zoneMark = one("[data-anim=pilot-zone-mark]");
  const zoneNear = one("[data-anim=pilot-zone-near]");
  const zonePassed = one("[data-anim=pilot-zone-passed]");
  const sources = one("[data-anim=pilot-sources]");
  const sourcesList = one("[data-anim=pilot-sources-list]");
  const people = one("[data-anim=pilot-people]");
  const peopleCard = one("[data-anim=pilot-people-card]");
  const holdMark = one("[data-anim=pilot-hold-mark]");
  const holdLabel = one("[data-anim=pilot-hold-label]");
  const bubble = one("[data-anim=pilot-bubble]");
  const bubbleBox = one("[data-anim=pilot-bubble-box]");
  const craft = one("[data-anim=pilot-craft]");
  const heading = one("[data-anim=pilot-heading]");

  const head = one("[data-anim=pilot-head]");
  const principle = one("[data-anim=pilot-principle]");
  const arcs = one("[data-anim=pilot-arc]");
  const needles = one("[data-anim=pilot-needle]");
  const dialValues = all(section, "[data-anim=pilot-dial-v]");
  const step = all(section, "[data-anim=pilot-step]");
  const stepName = all(section, "[data-anim=pilot-step-name]");
  const next = all(section, "[data-anim=pilot-next]");
  const status = all(section, "[data-anim=pilot-status]");
  const contacted = all(section, "[data-anim=pilot-contacted]");
  const fuel = all(section, "[data-anim=pilot-fuel]");
  const rows = mine("[data-anim=pilot-row]");
  const chips = mine("[data-anim=pilot-chip]");
  const log = one("[data-anim=pilot-log]");
  const approve = one("[data-anim=pilot-approve]");
  const channels = all(section, "[data-anim=pilot-channel]");
  const results = one("[data-anim=pilot-results]");
  const funnel = mine("[data-anim=pilot-funnel]");
  const funnelShare = funnel.map((el) => Number(el.dataset.share ?? 1));
  const tune = one("[data-anim=pilot-tune]");

  // El borde izquierdo útil, en px desde el foco: a la derecha del riel de
  // capítulos en escritorio (72 px), con el margen de 16 en móvil. Se lee el
  // ancho al construir y al redimensionar, nunca por frame.
  const focus = ctx.desktop ? PILOT_FOCUS.desktop.x : PILOT_FOCUS.mobile.x;
  const margin = ctx.desktop ? 72 : 16;
  const view = { overview: ctx.desktop ? PILOT_OVERVIEW.desktop : PILOT_OVERVIEW.mobile, left: 0, right: Infinity, names: ctx.desktop };
  const cockpit = section.querySelector<HTMLElement>(".film-pilot-cockpit");
  const measure = () => {
    const w = section.clientWidth;
    view.left = -focus * w + margin;
    // A la derecha: el filo de la cabina en escritorio (8 px antes); en móvil, el de la franja.
    const edgeX = ctx.desktop && cockpit ? cockpit.getBoundingClientRect().left - section.getBoundingClientRect().left - 8 : w - margin;
    view.right = edgeX - focus * w;
  };
  measure();
  window.addEventListener("resize", measure);
  gsap.context()?.add(() => () => window.removeEventListener("resize", measure));

  // `p` es el scroll; la historia (con sus mesetas) es `pilotStory(p)`.
  const paint = (p: number) => {
    const f = pilotFrame(pilotStory(p), run, view);
    // El plano y la ruta.
    set(plane, "transform", f.plane);
    set(done, "strokeDasharray", `${Math.max(0.0001, f.done).toFixed(4)} 2`);
    set(zone, "opacity", o(f.zone));
    set(sweep, "transform", `rotate(${f.sweep.toFixed(1)}deg)`);
    set(blip, "opacity", o(f.blip));
    set(hold, "opacity", o(f.hold));

    // Las marcas.
    fixes.forEach((el, i) => {
      set([el], "transform", at(f.marks.fixes[i]));
      set([el], "opacity", o(f.fixesIn * f.fixEdge[i]));
      flag([el], "data-lit", f.lit[i]);
    });
    set(tower, "transform", at(f.marks.tower));
    set(airport, "transform", at(f.marks.airport));
    // La zona y el destino entran con los fijos: desde arriba (p < 0,1) caerían sobre la cabina, que aún aparece.
    set(airportLabel, "opacity", o(f.airportLabel * f.fixesIn));
    set(zoneMark, "transform", at(f.marks.zone));
    set(zoneMark, "opacity", o(f.fixesIn * (ctx.desktop ? f.zoneBox : f.zoneTag)));
    set(zoneNear, "opacity", o(f.zoneNear));
    set(zonePassed, "opacity", o(f.zonePassed));
    set(sources, "transform", at(f.marks.sources));
    set(sourcesList, "opacity", o(f.sourcesIn));
    set(people, "transform", at(f.marks.people));
    set(peopleCard, "opacity", o(f.people));
    set(holdMark, "transform", at(f.marks.holdLabel));
    set(holdLabel, "opacity", o(f.holdLabel));
    set(bubble, "transform", at(f.marks.bubble));
    set(bubbleBox, "opacity", o(f.bubble));
    set(craft, "transform", at(f.marks.plane));
    set(craft, "opacity", o(f.planeIn));
    set(heading, "transform", `rotate(${f.heading.toFixed(1)}deg)`);

    // El titular se atenúa al final (en escritorio, donde la ficha sube encima).
    // Su entrada y la de la cabina son el `reveal` de sceneTimeline.
    if (ctx.desktop) {
      set(head, "opacity", o(f.head));
      set(principle, "opacity", o(f.head));
    }

    // Los instrumentos.
    [f.found, f.qualified, f.contacted].forEach((v, i) => {
      const d = dial(v, PILOT_DIAL_MAX);
      if (arcs[i]) set([arcs[i]], "strokeDasharray", `${Math.max(0.0001, d.arc).toFixed(4)} 1`);
      if (needles[i]) set([needles[i]], "transform", `rotate(${d.needle.toFixed(1)}deg)`);
      if (dialValues[i]) text([dialValues[i]], pad(v));
    });
    text(step, C.step(f.step + 1, PILOT_COPY.steps.length));
    text(stepName, PILOT_COPY.steps[f.step]);
    text(next, f.next === null ? PILOT_COPY.destination : PILOT_COPY.steps[f.next]);
    text(status, PILOT_STATUS[f.status]);
    text(contacted, String(f.contacted));
    const lit = capSegments(f.contacted, run.cap);
    fuel.forEach((el, i) => flag([el], "data-on", i < lit));

    // El tablero de llegadas: el texto y la variante solo al cambiar; el volteo, en transform.
    f.board.forEach((r, i) => {
      const chip = chips[i];
      if (!chip) return;
      text([chip], r.stage ? PILOT_STAGES[r.stage] : "—");
      flag([chip], "data-stage", r.stage ?? false);
      // Un solo paso: la etapa vieja se va de golpe y la nueva entra por opacidad.
      set([chip], "opacity", o(r.enter));
      if (rows[i]) flag([rows[i]], "data-skipped", !PILOT_LOT[i] && f.skippedDim);
    });

    // La cabina por fases: bitácora, lote y canales.
    log.forEach((el, i) => set([el], "opacity", o(f.log[i] ?? 1)));
    set(approve, "transform", `scale(${f.pressScale.toFixed(3)})`);
    channels.forEach((el, i) => flag([el], "data-on", i < f.channels));

    // La ficha del mes y el ajuste de Axi.
    set(results, "opacity", o(f.results));
    set(results, "transform", `translateY(${px(30 * (1 - f.results))}px)`);
    funnel.forEach((el, i) => set([el], "transform", `scaleX(${(funnelShare[i] * f.funnel).toFixed(4)})`));
    set(tune, "opacity", o(f.tune));

    // Lo que cambia por tramos va en atributos de la escena: el CSS decide.
    flag(me, "data-phase", f.phase);
    flag(me, "data-status", f.status);
    flag(me, "data-landed", f.airportLit);
  };

  const progress = { p: 0 };
  paint(0);
  tl.fromTo(progress, { p: 0 }, { p: 1, ease: "none", duration: SPAN, onUpdate: () => paint(progress.p) }, 0);
};
