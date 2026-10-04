/**
 * El cierre (plan §16.4), con scrub desde «top 80 %» hasta «center center»,
 * sin fijar. `p` va de 0 a 1 sobre `SPAN` unidades de línea:
 *
 * | Tramo     | Qué pasa                                                        |
 * |-----------|-----------------------------------------------------------------|
 * | 0–0,38    | Trazo blanco por cinta: coral 0–0,3, violeta 0,06–0,34, ámbar 0,12–0,38; el isotipo escala de 0,92 a 1 (0–0,5) |
 * | 0,3–0,54  | Las cintas se llenan (coral 0,3, violeta 0,35, ámbar 0,4; 0,14 cada una) y el trazo se apaga (0,3–0,5) |
 * | 0,4–0,7   | El halo florece: opacidad 0,4–0,62, escala 0,7 → 1 en 0,4–0,7   |
 * | 0,5–0,72  | «Tu próxima venta» (0,5) y «ya está escribiendo.» (0,58) suben 26 px |
 * | 0,68–0,78 | La burbuja «… está escribiendo»; sus puntos parpadean con el scroll |
 * | 0,8–0,92  | Los CTA                                                         |
 *
 * Solo `transform`, `opacity`, `fill-opacity` y el trazo de SVG. Nada en bucle:
 * los puntos parpadean con el progreso, no con un reloj.
 */
import { gsap } from "gsap";

const SPAN = 10;
const at = (p: number) => p * SPAN;
const EASE = "power3.out";

export function close(section: HTMLElement): void {
  const q = (sel: string) => Array.from(section.querySelectorAll<HTMLElement>(sel));
  const one = (sel: string) => section.querySelector<HTMLElement>(sel);

  const tl = gsap.timeline({
    defaults: { ease: EASE },
    scrollTrigger: { trigger: section, start: "top 80%", end: "center center", scrub: true, invalidateOnRefresh: true },
  });
  tl.to({}, { duration: 0 }, SPAN);

  const mark = one("[data-anim=close-mark]");
  if (mark) tl.fromTo(mark, { scale: 0.92 }, { scale: 1, duration: at(0.5) }, 0);

  // Las cintas: el trazo se dibuja escalonado, luego cada una se llena.
  const ribbons: [name: string, draw: number, fill: number][] = [
    ["coral", 0, 0.3],
    ["violet", 0.06, 0.35],
    ["amber", 0.12, 0.4],
  ];
  for (const [name, draw, fill] of ribbons) {
    const path = section.querySelector<SVGPathElement>(`[data-anim=close-mark] [data-ribbon=${name}]`);
    if (!path) continue;
    tl.fromTo(path, { strokeDasharray: "0.0001 2" }, { strokeDasharray: "1 2", duration: at(0.3) }, at(draw));
    tl.fromTo(path, { fillOpacity: 0 }, { fillOpacity: 1, duration: at(0.14) }, at(fill));
    // El trazo aparece con el dibujo y se apaga mientras se llena (0,9 → 0).
    tl.fromTo(path, { strokeOpacity: 0.9 }, { strokeOpacity: 0, duration: at(0.2) }, at(0.3));
  }

  const bloom = q("[data-anim=close-bloom]");
  if (bloom.length) {
    tl.fromTo(bloom, { opacity: 0 }, { opacity: 1, duration: at(0.22) }, at(0.4));
    tl.fromTo(bloom, { scale: 0.7 }, { scale: 1, duration: at(0.3) }, at(0.4));
  }

  const rise = (sel: string, from: number, dy: number) => {
    const els = q(sel);
    if (els.length) tl.fromTo(els, { opacity: 0, y: dy }, { opacity: 1, y: 0, duration: at(0.14) }, at(from));
  };
  rise("[data-anim=close-l1]", 0.5, 26);
  rise("[data-anim=close-l2]", 0.58, 26);
  const typing = q("[data-anim=close-typing]");
  if (typing.length) tl.fromTo(typing, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: at(0.1) }, at(0.68));
  const ctas = q("[data-anim=close-ctas]");
  if (ctas.length) tl.fromTo(ctas, { opacity: 0 }, { opacity: 1, duration: at(0.12) }, at(0.8));

  // Los tres puntos del «escribiendo»: parpadean con el progreso del scroll.
  const dots = q("[data-anim=close-dot]");
  if (dots.length) {
    const blink = { p: 0 };
    // Escritura directa (no `gsap.set`, que crearía un tween por frame); al
    // revertir el motor se quita y los puntos vuelven a su reposo del CSS.
    const paint = () =>
      dots.forEach((dot, i) => {
        dot.style.opacity = (0.35 + 0.65 * Math.abs(Math.sin(blink.p * 18 + i * 0.8))).toFixed(3);
      });
    gsap.context()?.add(() => () => dots.forEach((dot) => dot.style.removeProperty("opacity")));
    tl.fromTo(blink, { p: 0 }, { p: 1, ease: "none", duration: SPAN, onUpdate: paint }, 0);
  }
}
