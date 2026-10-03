/**
 * El video inmersivo (plan §23): fijada, el titular se va y el marco se abre
 * hasta la pantalla entera. Solo transform y opacity; el radio del recorte se
 * compensa con la escala para que se vea constante y llegue a 0 a sangre.
 *
 * Y la luz del hero que abraza el marco (plan §25, `domain/film/video-light.ts`):
 * la gota releva al nudo del hero al primer píxel de scroll, cae, se aplasta
 * en un destello sobre el filo, los arcos rodean el marco y el anillo queda
 * encendido hasta que la apertura lo apaga. Solo transform, opacity y el
 * dashoffset de los arcos; la geometría se mide al refrescar, nunca por frame.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { FRAME, lightState, openOf } from "@/modules/landing/domain/film/video-light";
import { atP, segP, sceneTimeline, PASS_DESKTOP, SPAN, all, visible, writer, type Ctx, type Scene } from "@/modules/landing/ui/film/engine/film-kit";

export const video: Scene = (section: HTMLElement, ctx: Ctx) => {
  // En móvil el video ya va entero a lo ancho desde el principio (film-video.css):
  // abrir un marco en el tramo corto de la entrada no se alcanzaba a ver. La luz
  // es el filamento.
  if (!ctx.desktop) {
    filament(section);
    return;
  }
  const tl = sceneTimeline(section, ctx, 180, PASS_DESKTOP);
  tl.to({}, { duration: 0 }, SPAN);
  const frames = visible(section, "[data-anim=video-frame]");
  const clips = visible(section, "[data-anim=video-clip]");
  const heads = visible(section, "[data-anim=head]");
  const vignettes = visible(section, "[data-anim=video-vignette]");
  const caps = visible(section, "[data-anim=video-cap]");
  const s0 = FRAME.scale;
  const w = writer();
  const proxy = { p: 0 };
  const paint = (p: number) => {
    const open = openOf(p);
    const s = s0 + (1 - s0) * open;
    w.write(frames, "transform", `translate3d(0, ${((1 - open) * FRAME.ty * 100).toFixed(2)}%, 0) scale(${s.toFixed(4)})`);
    // El radio vive en el recorte, dentro de la escala: dividirlo lo deja constante.
    for (const c of clips) {
      const r = ((1 - open) * FRAME.radius) / s;
      const v = `${r.toFixed(2)}px`;
      if (c.style.borderRadius !== v) c.style.borderRadius = v;
    }
    w.write(vignettes, "opacity", (0.3 + 0.7 * open).toFixed(3));
    w.write(caps, "opacity", segP(p, 0.7, 0.9).toFixed(3));
  };
  paint(0);
  tl.fromTo(proxy, { p: 0 }, { p: 1, ease: "none", duration: atP(1), onUpdate: () => paint(proxy.p) }, 0);
  // El titular entra con el reveal del kit antes del pin y se va al abrirse el marco.
  if (heads.length) tl.to(heads, { opacity: 0, y: -40, ease: "none", duration: atP(0.26) }, atP(0.04));
  heroLight(section, tl);
  gsap.context()?.add(() => () => {
    w.restore();
    for (const c of clips) c.style.removeProperty("border-radius");
  });
};

/** Por debajo de 1024: la luz se vuelve un filamento sobre el borde del video que se abre y se apaga. */
function filament(section: HTMLElement) {
  const el = section.querySelector<HTMLElement>("[data-light=filament]");
  if (!el) return;
  const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: "top 85%", end: "top 15%", scrub: true } });
  tl.fromTo(el, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, ease: "power2.out", duration: 0.5 }, 0);
  tl.to(el, { opacity: 0, ease: "none", duration: 0.5 }, 0.5);
}

/** Lo que la cabeza de cada arco lleva de luz más brillante, en px de trazo. */
const HEAD = 46;
/** El bloom más ancho (film-video.css): el disco tiene que cubrirlo al girar. */
const BLOOM = 72;
/** Un giro del disco, en segundos, y la respiración del anillo (±6 % en este periodo). */
const TURN = 9;
const BREATH = 4.2;

function heroLight(section: HTMLElement, tl: gsap.core.Timeline) {
  const pin = tl.scrollTrigger;
  const spacer = pin?.trigger as HTMLElement | undefined;
  const hero = document.querySelector<HTMLElement>('[data-scene="hero"]');
  const one = <T extends Element = HTMLElement>(sel: string) => section.querySelector<T>(sel);
  const drop = one("[data-light=drop]");
  const trail = one(".film-vlight-trail");
  const flash = one("[data-light=flash]");
  const svg = one<SVGSVGElement>("[data-light=arcs]");
  const ring = one("[data-light=ring]");
  const discs = all(section, "[data-anim=vlight-disc]");
  const bands = all(section, "[data-anim=vlight-bands]");
  if (!pin || !spacer || spacer === section || !hero || !drop || !trail || !flash || !svg || !ring || !discs.length || bands.length !== discs.length) return;
  const arcs = Array.from(svg.querySelectorAll<SVGPathElement>("path"));
  const strokes = arcs.filter((p) => !p.classList.contains("film-vlight-arc-head"));
  const heads = arcs.filter((p) => p.classList.contains("film-vlight-arc-head"));
  // Por pieza. El bloom va aparte (`-soft`): sus esquinas no escalan con el
  // radio (es difuso) y sus filos acaban donde empiezan ellas, con el radio
  // de reposo, como en el anillo cerrado. Si sus filos llegaran a la tangente
  // del radio que encoge, sus cabos rectos asomarían por fuera de la esquina.
  const pieces = new Map<string, HTMLElement[]>();
  for (const el of all(ring, "[data-piece]")) {
    const key = el.parentElement?.classList.contains("film-vlight-bloom") ? `${el.dataset.piece}-soft` : el.dataset.piece!;
    pieces.set(key, [...(pieces.get(key) ?? []), el]);
  }
  const w = writer();

  // Geometría: se mide al construir y en cada refresh (cambio de tamaño).
  let vh = 1;
  let sw = 1;
  let sh = 1;
  let heroAt = 0;
  let heroH = 0;
  let length = 1;
  // La velocidad de la gota (estado entre frames).
  let stretch = 0;
  let lastTop = NaN;
  let lastT = 0;
  const measure = () => {
    vh = window.innerHeight;
    sw = section.offsetWidth;
    sh = section.offsetHeight;
    // El hero respecto al borde superior de la escena (layout: solo aquí).
    heroAt = hero.getBoundingClientRect().top - spacer.getBoundingClientRect().top;
    heroH = hero.offsetHeight;
    // Los arcos: el contorno del marco en reposo, 1,6 px por fuera del filo,
    // del centro de arriba al de abajo por cada lado.
    const pad = 1.6;
    const x0 = sw * 0.2 - pad;
    const x1 = sw * 0.8 + pad;
    const y0 = sh * (0.5 + FRAME.ty - FRAME.scale / 2) - pad;
    const y1 = y0 + sh * FRAME.scale + 2 * pad;
    const r = FRAME.radius + pad;
    const cx = sw / 2;
    svg.setAttribute("viewBox", `0 0 ${sw} ${sh}`);
    for (const path of arcs) {
      const cw = path.dataset.arc === "cw";
      const [x, sweep] = cw ? [x1, 1] : [x0, 0];
      const k = cw ? -1 : 1;
      path.setAttribute(
        "d",
        `M${cx},${y0} H${x + k * r} A${r},${r} 0 0 ${sweep} ${x},${y0 + r} V${y1 - r} A${r},${r} 0 0 ${sweep} ${x + k * r},${y1} H${cx}`,
      );
    }
    length = arcs[0]?.getTotalLength?.() || 1;
    for (const p of strokes) p.style.strokeDasharray = `${length} ${length + 10}`;
    for (const p of heads) p.style.strokeDasharray = `${HEAD} ${length + HEAD}`;
    // El disco: un cuadrado centrado en el marco que cubre el anillo abierto
    // casi del todo (se apaga a 0,92) y su bloom; las bandas, dentro, en su sitio.
    const D = Math.ceil(Math.hypot(sw * 0.92, sh * 0.92) + 2 * BLOOM + 8);
    const fx = sw / 2;
    const fy = sh * (0.5 + FRAME.ty);
    for (const disc of discs) {
      Object.assign(disc.style, { inset: "auto", left: `${fx - D / 2}px`, top: `${fy - D / 2}px`, width: `${D}px`, height: `${D}px` });
      disc.setAttribute("data-square", "");
    }
    for (const band of bands) {
      Object.assign(band.style, { left: `${D / 2 - fx}px`, top: `${D / 2 - fy}px`, width: `${sw}px`, height: `${sh}px`, transformOrigin: `${fx}px ${fy}px` });
    }
    lastTop = NaN;
  };

  // La llegada: de asomar por abajo a quedar fijada arriba.
  const approach = ScrollTrigger.create({ trigger: spacer, start: "top bottom", end: "top top", onRefresh: measure });

  // Dónde estaba el nudo en pantalla cuando la escena asomaba por abajo
  // (`a = 0`): su altura en el hero más el hero respecto a la escena, más una
  // ventana. La altura la escribe HeroFibers en `--knot-y` cuando llega (va en
  // diferido, a veces después de construir esta escena): se lee del estilo
  // en línea en cada frame, que no recalcula nada. Sin ella, el nudo aún no
  // existe (red lenta): no hay gota que relevar ni destello; la caída no se
  // inventa desde el 68 %, y el anillo se enciende igual con los arcos. Si el
  // nudo llega cuando el visitante ya bajó, tampoco: la gota saldría de golpe a
  // media caída; el nudo hace su salida de siempre (HeroFibers). La gota solo
  // releva a un nudo que ya estaba al empezar la llegada (`a < 0,05`, unos
  // 45 px: el primer frame con scroll ya trae `a > 0`).
  let rested = false;
  const frame = (time: number) => {
    const knotAt = parseFloat(hero.style.getPropertyValue("--knot-y"));
    if (Number.isFinite(knotAt) && approach.progress < 0.05) rested = true;
    const knot = rested && Number.isFinite(knotAt);
    const s = lightState({ a: approach.progress, p: pin.progress, vh, sh, knotY: vh + heroAt + (knot ? knotAt : heroH * 0.68) });
    if (!knot) {
      s.drop = 0;
      s.flash.alpha = 0;
    }
    // Nunca el nudo y la gota a la vez: desde el primer píxel, la luz es la gota.
    w.flag([hero], "data-relay", knot && approach.progress > 0);

    // La gota se estira con la velocidad (no con la posición) mientras cae, y
    // al soltar el scroll vuelve a su redondez sin rebote (una exponencial).
    const dt = Math.max(1, (time - lastT) * 1000);
    const v = Number.isNaN(lastTop) ? 0 : Math.abs(s.top - lastTop) / dt;
    lastTop = s.top;
    lastT = time;
    const target = s.u < 0 ? Math.min(1, v / 1.4) : 0; // 1,4 px/ms (una rueda decidida) estira del todo
    stretch += (target - stretch) * (1 - Math.exp(-dt / 110));
    if (stretch < 0.002) stretch = 0;
    const [sx, sy, lift] = s.u > 0 ? [s.squash.x, s.squash.y, 0] : [1 - 0.28 * stretch, 1 + 0.7 * stretch, 26 * stretch];
    w.write([drop], "transform", `translate3d(0, ${(s.dropY - lift).toFixed(1)}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`);
    w.write([drop], "opacity", s.drop.toFixed(3));
    w.write([trail], "opacity", (s.u > 0 ? 0 : 0.9 * stretch * s.drop).toFixed(3));

    // El contacto: el destello y los arcos, con la cabeza más brillante.
    w.write([flash], "opacity", s.flash.alpha.toFixed(3));
    w.write([flash], "transform", `scaleX(${s.flash.scaleX.toFixed(3)})`);
    w.write([svg], "opacity", s.arcs.alpha.toFixed(3));
    if (s.arcs.alpha > 0) {
      const drawn = s.arcs.drawn * length;
      w.write(strokes, "strokeDashoffset", (length - drawn).toFixed(1));
      w.write(heads, "strokeDashoffset", (HEAD - drawn).toFixed(1));
      w.write(heads, "opacity", s.arcs.head.toFixed(3));
    }

    // El anillo: respira ±6 % cuando ya está cerrado y el disco da la vuelta despacio.
    const breath = 0.94 + 0.06 * Math.sin((2 * Math.PI * time) / BREATH) * s.breath;
    w.write([ring], "opacity", (s.ring * breath).toFixed(3));
    if (s.ring <= 0) return;
    const turn = ((time / TURN) * 360) % 360;
    // El marco abierto (en px de la escena) contra el de reposo: los filos se
    // estiran a lo largo y se mueven; las esquinas se mueven y siguen el radio.
    const sc = FRAME.scale + (1 - FRAME.scale) * s.open;
    const x0 = sw * (0.5 - FRAME.scale / 2);
    const y0 = sh * (0.5 + FRAME.ty - FRAME.scale / 2);
    const x = sw * (0.5 - sc / 2);
    const y = sh * (0.5 + FRAME.ty * (1 - s.open) - sc / 2);
    const dx = x0 - x; // lo que crece cada lado en horizontal
    const top = y - y0;
    const bottom = y + sh * sc - (y0 + sh * FRAME.scale);
    const mid = (top + bottom) / 2;
    // El radio visible del recorte: las esquinas escalan con él y los filos llegan a su tangente.
    const f = Math.max(0.001, 1 - s.open);
    const r = FRAME.radius * f;
    const kx = (sw * sc - 2 * r) / (sw * FRAME.scale - 2 * FRAME.radius);
    const ky = (sh * sc - 2 * r) / (sh * FRAME.scale - 2 * FRAME.radius);
    const kxSoft = (sw * sc - 2 * FRAME.radius) / (sw * FRAME.scale - 2 * FRAME.radius);
    const kySoft = (sh * sc - 2 * FRAME.radius) / (sh * FRAME.scale - 2 * FRAME.radius);
    const corner = f < 1 ? ` scale(${f.toFixed(4)})` : "";
    const t = (px: number, py: number, extra = "") => `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)${extra}`;
    const set = (key: string, value: string) => w.write(pieces.get(key) ?? [], "transform", value);
    for (const [suffix, x, y] of [["", kx, ky], ["-soft", kxSoft, kySoft]] as const) {
      set(`t${suffix}`, t(0, top, ` scaleX(${x.toFixed(4)})`));
      set(`b${suffix}`, t(0, bottom, ` scaleX(${x.toFixed(4)})`));
      set(`l${suffix}`, t(-dx, mid, ` scaleY(${y.toFixed(4)})`));
      set(`r${suffix}`, t(dx, mid, ` scaleY(${y.toFixed(4)})`));
    }
    for (const [key, x, y] of [["tl", -dx, top], ["tr", dx, top], ["bl", -dx, bottom], ["br", dx, bottom]] as const) {
      set(key, t(x, y, corner));
      set(`${key}-soft`, t(x, y));
    }
    // El disco sigue al centro del marco y gira; las bandas giran al revés para quedarse quietas.
    w.write(discs, "transform", `translate3d(0, ${mid.toFixed(1)}px, 0) rotate(${turn.toFixed(2)}deg)`);
    w.write(bands, "transform", `rotate(${(-turn).toFixed(2)}deg) translate3d(0, ${(-mid).toFixed(1)}px, 0)`);
  };

  // Solo late mientras la escena está a la vista (de asomar a soltarse): el
  // disco y la respiración necesitan frames aunque no haya scroll.
  // Al salir, pinta un último fotograma en el tick siguiente: el `onToggle` llega
  // en medio de la actualización de ScrollTrigger, y la llegada aún podía no
  // estar en 0 (la gota y `data-relay` se quedaban puestos en el reposo).
  let ticking = false;
  let stopping = false;
  const tick = (time: number) => {
    frame(time);
    if (!stopping) return;
    stopping = false;
    gsap.ticker.remove(tick);
  };
  const run = (on: boolean) => {
    if (on === ticking) return;
    ticking = on;
    if (on) {
      if (!stopping) gsap.ticker.add(tick);
      stopping = false;
    } else stopping = true;
  };
  ScrollTrigger.create({ trigger: spacer, start: "top bottom", end: "bottom bottom", onToggle: (self) => run(self.isActive) });
  measure();
  frame(gsap.ticker.time);
  run(approach.progress > 0 && pin.progress < 1);

  gsap.context()?.add(() => () => {
    gsap.ticker.remove(tick);
    w.restore();
    for (const el of [...discs, ...bands]) el.removeAttribute("style");
    for (const disc of discs) disc.removeAttribute("data-square");
    svg.removeAttribute("viewBox");
    for (const p of arcs) {
      p.removeAttribute("d");
      p.removeAttribute("style");
    }
  });
}
