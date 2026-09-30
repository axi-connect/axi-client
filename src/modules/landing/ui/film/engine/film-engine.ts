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

import { FILM_NICHES } from "@/modules/landing/domain/film/niches";
import { roadPercentAt } from "@/modules/landing/domain/film/route-map";
import { formatMillions, formatPercent, ROUTE_FRACTIONS } from "@/modules/landing/domain/film/route-scenario";

export type FilmEngine = { stop(): void; scrollTo(target: string): void };

type Ctx = { desktop: boolean };
type Scene = (section: HTMLElement, ctx: Ctx) => void;

/* ────────────────────────────── utilidades ────────────────────────────── */

const all = (scope: ParentNode, sel: string) => Array.from(scope.querySelectorAll<HTMLElement>(sel));

/**
 * Los elementos de `sel` agrupados por nicho. Las escenas traen las cuatro
 * variantes en el HTML; cada grupo se anima con los MISMOS tiempos, así el
 * nicho visible siempre está sincronizado con el scroll aunque cambie a mitad
 * de la película. Si la escena no tiene variantes, un único grupo.
 */
function perNiche(section: HTMLElement, sel: string): HTMLElement[][] {
  const groups = FILM_NICHES.map((n) => all(section, `[data-only~="${n}"]`).flatMap((w) => all(w, sel)));
  if (groups.some((g) => g.length > 0)) return groups.filter((g) => g.length > 0);
  return [all(section, sel)];
}

/**
 * Ritmo de la película: multiplica la longitud de cada pin. Medido en el render
 * del 2026-09-30: con 1 la película de escritorio pasaba de 30.000 px.
 */
const PACE = 0.8;

const reveal = { opacity: 0, y: 24 };

/**
 * Una línea de tiempo de escena: fijada si cabe, revelada al pasar si no.
 *
 * El titular de la escena NO va en la línea fijada: aparece mientras la escena
 * entra en pantalla, para que al fijarse ya se lea de qué trata y la escena no
 * llegue como un escenario vacío.
 */
function sceneTimeline(section: HTMLElement, ctx: Ctx, length: number): gsap.core.Timeline {
  const heads = all(section, "[data-anim=head]");
  if (heads.length) {
    gsap.from(heads, { ...reveal, ease: "power2.out", scrollTrigger: { trigger: section, start: "top 88%", end: "top 30%", scrub: 0.6 } });
  }
  const fits = ctx.desktop && section.offsetHeight <= window.innerHeight * 1.02;
  return gsap.timeline({
    defaults: { ease: "power2.out", duration: 1 },
    scrollTrigger: fits
      ? { trigger: section, start: "top top", end: `+=${Math.round(length * PACE)}%`, pin: true, scrub: 0.6, anticipatePin: 1 }
      : { trigger: section, start: "top 78%", end: "bottom 62%", scrub: 0.6 },
  });
}

/** Dibuja las cintas de una escena de 0 a 1 (`pathLength=1`). */
function drawRibbons(tl: gsap.core.Timeline, section: HTMLElement, at: number, duration = 2) {
  const paths = all(section, "[data-ribbon-path]");
  if (!paths.length) return;
  gsap.set(paths, { strokeDasharray: "1 1" });
  tl.fromTo(paths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none", duration }, at);
}

/** Cuenta hacia arriba un número con separador de miles colombiano. */
function countUp(tl: gsap.core.Timeline, el: HTMLElement, at: number) {
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
        el.textContent = prefix + Math.round(proxy.v).toLocaleString("es-CO");
      },
    },
    at,
  );
}

/* ─────────────────────────────── escenas ─────────────────────────────── */

const hero: Scene = (section) => {
  const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true } });
  drawRibbons(tl, section, 0, 1);
  tl.to(all(section, "[data-anim=copy]"), { y: -90, opacity: 0.15, ease: "none" }, 0);
  tl.to(all(section, "[data-anim=alpha]"), { y: 60, scale: 0.92, ease: "none" }, 0);
  for (const b of all(section, "[data-anim=bubble]")) {
    const depth = Number(b.dataset.depth ?? 0);
    tl.to(b, { y: -110 * (depth + 1), ease: "none" }, 0);
  }
};

const niche: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 70);
  drawRibbons(tl, section, 0);
  tl.from(all(section, "[data-anim=niche]"), { ...reveal, y: 60, stagger: 0.12 }, 0.3);
};

const radar: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 140);
  drawRibbons(tl, section, 0, 1.2);
  tl.fromTo(all(section, "[data-anim=sweep]"), { rotation: 0 }, { rotation: 540, ease: "none", duration: 4 }, 0);
  tl.from(all(section, "[data-anim=dot]"), { scale: 0, stagger: 0.08, duration: 0.3 }, 0.2);
  tl.from(all(section, "[data-anim=hit]"), { scale: 0, stagger: 0.3, duration: 0.4 }, 1);
  tl.from(all(section, "[data-anim=target]"), { scale: 0, duration: 0.4 }, 1.8);
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

const chat: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 180);
  drawRibbons(tl, section, 0, 1);
  for (const group of perNiche(section, "[data-anim=msg]")) tl.from(group, { opacity: 0, y: 18, stagger: 0.7, duration: 0.5 }, 0.4);
  for (const group of perNiche(section, "[data-anim=sale]")) tl.from(group, { opacity: 0, y: 30 }, 4.6);
};

const photo: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 120);
  for (const group of perNiche(section, "[data-anim=shot]")) tl.from(group, { opacity: 0, x: -40 }, 0.2);
  for (const group of perNiche(section, "[data-anim=scan]")) tl.fromTo(group, { yPercent: -9000 }, { yPercent: 7000, ease: "none", duration: 1.6 }, 0.6);
  for (const group of perNiche(section, "[data-anim=tile]")) tl.from(group, { opacity: 0.2, stagger: 0.08, duration: 0.4 }, 0.8);
  for (const group of perNiche(section, "[data-anim=match]")) tl.from(group, { scale: 0.9, opacity: 0.4 }, 2);
  for (const group of perNiche(section, "[data-anim=recognized]")) tl.from(group, { opacity: 0, y: 12 }, 2.3);
  for (const group of perNiche(section, "[data-anim=msg]")) tl.from(group, reveal, 2.8);
};

const call: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 130);
  tl.from(all(section, "[data-anim=aura]"), { scale: 0.8, opacity: 0.4 }, 0);
  for (const group of perNiche(section, "[data-anim=line]")) tl.from(group, { opacity: 0, y: 12, stagger: 0.6, duration: 0.5 }, 0.5);
  tl.from(all(section, "[data-anim=stage-line]"), { scaleX: 0, transformOrigin: "left", ease: "none", duration: 2.4 }, 0.6);
  tl.from(all(section, "[data-anim=stage]"), { opacity: 0.2, stagger: 0.4, duration: 0.4 }, 0.6);
  for (const group of perNiche(section, "[data-anim=outcome]")) tl.from(group, { opacity: 0, y: 16 }, 3.2);
};

const vault: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 110);
  tl.from(all(section, "[data-anim=ring]"), { scale: 0.6, opacity: 0, stagger: 0.15 }, 0.2);
  for (const group of perNiche(section, "[data-anim=msg]")) {
    tl.from(group[0], reveal, 0.6);
    tl.from(group.slice(1), reveal, 2.4);
  }
  tl.from(all(section, "[data-anim=lock]"), { opacity: 0, y: 16, stagger: 0.3, duration: 0.5 }, 1.2);
};

const team: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 120);
  tl.from(all(section, "[data-anim=mode]"), { opacity: 0.25, stagger: 0.7, duration: 0.5 }, 0.2);
  for (const group of perNiche(section, "[data-anim=inbox]")) tl.from(group, { opacity: 0, y: 30 }, 0);
  for (const group of perNiche(section, "[data-anim=msg]")) tl.from(group, { ...reveal, stagger: 0.7 }, 0.6);
  for (const group of perNiche(section, "[data-anim=return]")) tl.from(group, { opacity: 0, scale: 0.9 }, 2.8);
};

const collect: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 130);
  for (const group of perNiche(section, "[data-anim=order]")) tl.from(group, reveal, 0.2);
  for (const group of perNiche(section, "[data-anim=segment]")) tl.from(group, { scaleX: 0, transformOrigin: "left", stagger: 0.6, duration: 0.6 }, 0.6);
  for (const group of perNiche(section, "[data-anim=row]")) tl.from(group, { opacity: 0.2, stagger: 0.6, duration: 0.4 }, 0.8);
  for (const group of perNiche(section, "[data-anim=reminders]")) tl.from(group, reveal, 1.6);
  for (const group of perNiche(section, "[data-anim=msg]")) tl.from(group, { ...reveal, stagger: 0.5 }, 1.9);
  for (const group of perNiche(section, "[data-anim=document]")) tl.from(group, { opacity: 0, y: 30, rotation: -4 }, 3.2);
};

const pipeline: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 110);
  for (const group of perNiche(section, "[data-anim=board]")) tl.from(group, reveal, 0);
  // La oportunidad salta de Propuesta a Compromiso (una columna a la izquierda).
  for (const group of perNiche(section, "[data-anim=deal]")) {
    if (ctx.desktop) tl.from(group, { xPercent: -108, ease: "back.out(1.4)", duration: 1.2 }, 0.8);
    else tl.from(group, { opacity: 0, y: 20 }, 0.8);
  }
  for (const group of perNiche(section, "[data-anim=ghost]")) tl.from(group, { opacity: 0 }, 1.6);
  for (const group of perNiche(section, "[data-anim=appointment]")) tl.from(group, reveal, 2.2);
};

const goal: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 200);
  for (const group of perNiche(section, "[data-anim=navpanel]")) tl.from(group, { opacity: 0, x: ctx.desktop ? 60 : 0, y: ctx.desktop ? 0 : 40 }, 0.2);

  // «Vas aquí» avanza por la carretera: el trazo recorrido y la marca se mueven juntos.
  const roads = all(section, "[data-anim=road], [data-anim=road-glow]");
  const heres = all(section, "[data-anim=here]");
  const values = all(section, "[data-anim=here-value]");
  const progress = { p: 0 };
  const paint = () => {
    const p = progress.p;
    for (const r of roads) r.style.strokeDasharray = `${p} 2`;
    const pos = roadPercentAt(p);
    for (const h of heres) {
      h.style.left = pos.left;
      h.style.top = pos.top;
    }
    for (const v of values) v.textContent = `${formatMillions(Number(v.dataset.goal) * p)} · ${formatPercent(p)}`;
  };
  tl.fromTo(progress, { p: 0 }, { p: ROUTE_FRACTIONS.done, ease: "power1.inOut", duration: 2.2, onUpdate: paint }, 0.2);

  tl.from(all(section, "[data-anim=should]"), { opacity: 0, scale: 0.5 }, 2.2);
  tl.from(all(section, "[data-anim=road-slow], [data-anim=slow]"), { opacity: 0 }, 2.4);
  tl.from(all(section, "[data-anim=projection]"), { opacity: 0 }, 2.7);
  for (const group of perNiche(section, "[data-anim=step]")) tl.from(group, { opacity: 0.2, x: 12, stagger: 0.2, duration: 0.4 }, 1);

  // Axi propone otra ruta y la llegada sube (82 % → 91 %).
  const projections = all(section, "[data-anim=projection]");
  const pcts = all(section, "[data-anim=projection-pct]");
  const pvalues = all(section, "[data-anim=projection-value]");
  const route = { p: ROUTE_FRACTIONS.projected };
  const paintRoute = () => {
    const pos = roadPercentAt(route.p);
    for (const m of projections) {
      m.style.left = pos.left;
      m.style.top = pos.top;
    }
    for (const el of pcts) el.textContent = formatPercent(route.p);
    for (const el of pvalues) el.textContent = formatMillions(Number(el.dataset.goal) * route.p);
  };
  tl.from(all(section, "[data-anim=route-axi]"), { opacity: 0.35, scale: 0.97, duration: 0.5 }, 3.2);
  tl.fromTo(route, { p: ROUTE_FRACTIONS.projected }, { p: ROUTE_FRACTIONS.projectedWithRoute, duration: 0.9, onUpdate: paintRoute }, 3.5);
  tl.to({}, { duration: 0.5 });
};

const axel: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 100);
  for (const group of perNiche(section, "[data-anim=brief]")) tl.from(group, { opacity: 0, y: 20 }, 0.1);
  for (const group of perNiche(section, "[data-anim=summary]")) tl.from(group, { opacity: 0 }, 0.4);
  for (const group of perNiche(section, "[data-anim=proposal]")) tl.from(group, { ...reveal, stagger: 0.35 }, 0.9);
};

const measure: Scene = (section, ctx) => {
  const tl = sceneTimeline(section, ctx, 90);
  for (const group of perNiche(section, "[data-anim=bar]")) tl.from(group, { scaleY: 0, transformOrigin: "bottom", stagger: 0.25 }, 0.3);
  for (const group of perNiche(section, "[data-anim=count]")) for (const el of group) countUp(tl, el, 0.4);
};

const close: Scene = (section) => {
  const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: "top 85%", end: "top 25%", scrub: 0.6 } });
  drawRibbons(tl, section, 0, 1);
  tl.from(all(section, "[data-anim=alpha-close]"), { scale: 0.7, opacity: 0, ease: "power2.out" }, 0);
};

const SCENES: Record<string, Scene> = { hero, niche, radar, followup, chat, photo, call, vault, team, collect, pipeline, goal, axel, measure, close };

/* ──────────────────────────────── arranque ──────────────────────────────── */

export function startFilm(root: HTMLElement): FilmEngine {
  gsap.registerPlugin(ScrollTrigger);

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
  if (scroller) ScrollTrigger.defaults({ scroller });

  const mm = gsap.matchMedia(root);
  mm.add({ desktop: "(min-width: 1024px)", mobile: "(max-width: 1023px)" }, (context) => {
    const ctx: Ctx = { desktop: Boolean(context.conditions?.desktop) };
    for (const section of all(root, "[data-scene]")) {
      const build = SCENES[section.dataset.scene ?? ""];
      if (build) build(section, ctx);
    }
  });

  // Las fuentes o las imágenes pueden cambiar alturas después de medir.
  const refresh = () => ScrollTrigger.refresh();
  void document.fonts?.ready.then(refresh);

  return {
    stop() {
      mm.revert();
      gsap.ticker.remove(tick);
      lenis.destroy();
      if (scroller) ScrollTrigger.defaults({ scroller: window });
    },
    scrollTo(target: string) {
      lenis.scrollTo(target, { duration: 1.4 });
    },
  };
}
