/**
 * Precios (plan §16.2): una entrada, una sola vez, al llegar. Sin scrub,
 * porque aquí se compara y se lee: nada debe moverse mientras el visitante
 * mira una cifra.
 *
 * Tiempos del lienzo sobre `p` de 0 a 1 (`ENTRY` segundos): titular 0–0,3;
 * tarjetas escalonadas cada 0,12 (0,2–0,6, 0,32–0,72, 0,44–0,84), subiendo de
 * y 48 a 0; la recomendada se eleva 14 px al final (0,7–0,95), igual que la
 * franja Enterprise. El HTML ya está en el fotograma final (la recomendada,
 * elevada por CSS en escritorio): los tweens son `from`.
 */
import { gsap } from "gsap";

const ENTRY = 1.6;
const at = (p: number) => p * ENTRY;

export function pricing(section: HTMLElement, ctx: { desktop: boolean }): void {
  const q = (sel: string) => Array.from(section.querySelectorAll<HTMLElement>(sel));
  const heads = q("[data-anim=price-head]");
  const cards = q("[data-anim=price-card]");
  const featured = q(".film-price-card[data-featured]");
  const ent = q("[data-anim=price-ent]");

  // Un `ScrollTrigger` con `once` y no un IntersectionObserver suelto: así el
  // contexto de `matchMedia` del motor lo revierte con todo lo demás.
  const tl = gsap.timeline({
    defaults: { ease: "power3.out" },
    scrollTrigger: { trigger: section, start: "top 72%", once: true },
  });
  if (heads.length) tl.from(heads, { opacity: 0, y: 20, duration: at(0.3) }, 0);
  cards.forEach((card, i) => {
    tl.from(card, { opacity: 0, y: 48, duration: at(0.4) }, at(0.2 + i * 0.12));
  });
  // La elevación solo existe en escritorio (tres columnas); en móvil se apilan.
  if (ctx.desktop && featured.length) tl.from(featured, { y: 0, duration: at(0.25) }, at(0.7));
  if (ent.length) tl.from(ent, { opacity: 0, duration: at(0.25) }, at(0.7));

  // Con el teclado, la entrada no se espera: si el foco entra a la sección, el
  // fotograma final llega en el acto (auditoría, M2: «Hablar con ventas»
  // recibía el foco aún a opacidad 0).
  const reveal = () => tl.progress(1);
  section.addEventListener("focusin", reveal);
  gsap.context()?.add(() => () => section.removeEventListener("focusin", reveal));
}
