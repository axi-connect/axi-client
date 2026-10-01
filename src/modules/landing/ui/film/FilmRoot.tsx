"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { track } from "@/core/analytics/track";
import { FILM_CONTENT } from "@/modules/landing/domain/film/film-content";
import {
  DEFAULT_FILM_NICHE,
  FILM_NICHE_STORAGE_KEY,
  parseFilmNiche,
  type FilmNiche,
} from "@/modules/landing/domain/film/niches";
import { emitFilmEvent, FILM_CHAPTER_EVENT, type FilmChapterDetail } from "@/modules/landing/ui/film/film-events";
import { RAIL_COPY, RAIL_INDEX, currentIndex, travelEase, travelSeconds, type RailEntry } from "@/modules/landing/domain/film/rail-index";
import { FilmDrum } from "@/modules/landing/ui/film/parts/FilmDrum";

/**
 * La única isla cliente de la película.
 *
 * - Guarda el nicho y lo escribe en `data-niche` del raíz: las escenas son
 *   Server Components que traen las cuatro variantes y el CSS muestra una.
 * - Pinta la guía de progreso (riel/barra) y la píldora del nicho a partir del
 *   scroll del contenedor, sin depender del motor: funcionan también con
 *   movimiento reducido.
 * - Carga el motor (GSAP + ScrollTrigger + Lenis) DESPUÉS del primer frame, en
 *   el primer momento de reposo, y solo si el visitante no pidió movimiento
 *   reducido. Sin motor, cada escena se ve en su fotograma final.
 */

// Solo el tipo (se borra al compilar): el motor sigue llegando por import() diferido.
type Engine = import("@/modules/landing/ui/film/engine/film-engine").FilmEngine;

type FilmContextValue = {
  niche: FilmNiche;
  choose(niche: FilmNiche): void;
  goTo(target: string): void;
};

const FilmContext = createContext<FilmContextValue | null>(null);

export function useFilm(): FilmContextValue {
  const ctx = useContext(FilmContext);
  if (!ctx) throw new Error("useFilm fuera de <FilmRoot>");
  return ctx;
}

function readStoredNiche(): FilmNiche | null {
  try {
    return parseFilmNiche(window.localStorage.getItem(FILM_NICHE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function storeNiche(niche: FilmNiche) {
  try {
    window.localStorage.setItem(FILM_NICHE_STORAGE_KEY, niche);
  } catch {
    /* modo privado o almacenamiento bloqueado: el nicho vive solo en esta visita */
  }
}

function scroller(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-app-scroll]");
}

const TICKS = ["Captar", "Vender", "Cobrar", "Crecer"] as const;

/** Reposo mínimo tras `load` antes de que el motor arranque solo (sin intención). */
export const ENGINE_REST_MS = 2500;

/**
 * La píldora fuera de la vista sale del teclado (`inert`): antes de aparecer,
 * apartada en móvil (data-hide solo actúa ahí) o cediendo el sitio en
 * cualquier ancho (data-avoid). «Cambiar» recibía el foco con opacidad 0 y bajo
 * el borde de la pantalla (auditoría, M2). Se lee de sus propios atributos.
 */
function syncPillInert(pill: HTMLElement | null) {
  if (!pill) return;
  const mobile = window.matchMedia("(max-width: 1023px)").matches;
  const off =
    pill.getAttribute("data-on") !== "true" ||
    pill.getAttribute("data-avoid") === "true" ||
    (mobile && pill.getAttribute("data-hide") === "true");
  pill.toggleAttribute("inert", off);
}

export function FilmRoot({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  // El avance se escribe en el riel y en la barra de móvil, no en el raíz: una
  // variable cambiada en el raíz invalida el estilo de TODA la película en cada
  // frame (perfil del 2026-10-01: segundos de «Recalculate style» por escena).
  const railRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // El riel temario (lienzo v2): las escenas que hay en la página, la actual y
  // el recorrido en curso (su píldora «Hacia …» y la barra, escrita por ref).
  const [railEntries, setRailEntries] = useState<RailEntry[]>([]);
  const [railCurrent, setRailCurrent] = useState(0);
  const [toward, setToward] = useState<{ title: string; tone: string; to: number } | null>(null);
  const towardBarRef = useRef<HTMLSpanElement>(null);
  const travelRef = useRef<{ from: number; to: number } | null>(null);
  const travelTo = useRef<((entry: RailEntry) => void) | null>(null);
  const [niche, setNiche] = useState<FilmNiche>(DEFAULT_FILM_NICHE);
  const [started, setStarted] = useState(false);
  // `data-on` lo pone React: tras cada cambio, la píldora recalcula su `inert`.
  useEffect(() => syncPillInert(pillRef.current), [started]);
  const [chapter, setChapter] = useState(-1);

  // El nicho de la URL gana al recordado: es la campaña que trajo al visitante.
  useEffect(() => {
    const fromUrl = parseFilmNiche(new URLSearchParams(window.location.search).get("nicho"));
    const initial = fromUrl ?? readStoredNiche();
    if (initial) setNiche(initial);
    if (fromUrl) {
      storeNiche(fromUrl);
      track({ name: "film_niche_chosen", params: { niche: fromUrl, source: "url" } });
    }
  }, []);

  // Otro nicho: el motor anima solo la variante visible, así que rehace sus
  // líneas (y vuelve a medir: otro texto, otras alturas).
  useEffect(() => {
    engineRef.current?.setNiche();
  }, [niche]);

  // El scroll y también el foco (auditoría, m4): sin esto, tras elegir nicho el
  // siguiente Tab volvía a «¿Quién te escribe hoy?». El destino recibe el foco
  // sin desplazar nada (el desplazamiento lo hace el motor, suave).
  const goTo = useCallback((target: string) => {
    const el = document.querySelector<HTMLElement>(target);
    if (el) {
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }
    if (engineRef.current) return engineRef.current.scrollTo(target);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, []);

  const choose = useCallback(
    (next: FilmNiche) => {
      setNiche(next);
      storeNiche(next);
      track({ name: "film_niche_chosen", params: { niche: next, source: "choice" } });
      goTo("#vender");
    },
    [goTo],
  );

  // Guía de progreso y píldora. El progreso es UNA lectura por frame (el raíz)
  // escrita en una variable CSS; el capítulo y «ya estamos en precios» salen de
  // posiciones medidas al cambiar de tamaño, sin medir el DOM en cada frame.
  // Los setState solo disparan render cuando el valor cambia.
  useEffect(() => {
    const el = scroller();
    const root = rootRef.current;
    if (!el || !root) return;
    let frame = 0;
    let pastFilm = false;
    let beyondHero = false;
    const sync = () => setStarted(beyondHero && !pastFilm);
    // Dónde empiezan los precios dentro de la película. Se mide al cambiar de
    // tamaño (los pins del motor alargan la película al montarse), no por frame;
    // un IntersectionObserver no sirve aquí: si el scroll salta de «debajo» a
    // «encima» de los precios sin cruzarlos, no avisa.
    const after = root.querySelector<HTMLElement>('[data-scene="pricing"]');
    let afterTop = Infinity;
    // La píldora del nicho y el riel aparecen desde «¿Quién te escribe hoy?»:
    // antes (hero y video) no hay nicho que cambiar ni capítulo.
    const niche = root.querySelector<HTMLElement>('[data-scene="niche"]');
    let nicheTop = Infinity;
    // Dónde empieza la película en el scroll y cuánto mide: se miden al cambiar
    // de tamaño. Por frame solo se usa `scrollTop`, leído en el evento de scroll
    // (antes de que el motor escriba estilos en su frame: leerlo después
    // forzaría un layout en cada frame).
    let filmTop = 0;
    let filmHeight = 1;
    let viewHeight = el.clientHeight;
    let scrollTop = el.scrollTop;
    // Dónde empieza cada capítulo (su escena o, si se fija, su pin-spacer). Antes
    // lo decidía un IntersectionObserver, pero una escena fijada es `position:
    // fixed` y el observador del contenedor de scroll no la ve: al aterrizar a
    // mitad de un pin (un ancla, recargar) el capítulo se perdía (QA del nav, Radar y Chat).
    const marks = TICKS.map((t) => root.querySelector<HTMLElement>(`[data-chapter="${t}"]`));
    let chapterTops: number[] = marks.map(() => Infinity);
    const entries = RAIL_INDEX.filter((e) => root.querySelector(`#${CSS.escape(e.id)}`));
    const entryEls = entries.map((e) => root.querySelector<HTMLElement>(`#${CSS.escape(e.id)}`));
    setRailEntries(entries);
    let entryTops: number[] = entries.map(() => Infinity);
    let railNow = -1;
    const measure = () => {
      const top = root.getBoundingClientRect().top;
      filmTop = top - el.getBoundingClientRect().top + el.scrollTop;
      filmHeight = root.offsetHeight;
      viewHeight = el.clientHeight;
      if (after) afterTop = after.getBoundingClientRect().top - top;
      if (niche) nicheTop = niche.getBoundingClientRect().top - top;
      chapterTops = marks.map((m) => {
        if (!m) return Infinity;
        const box = m.parentElement?.classList.contains("pin-spacer") ? m.parentElement : m;
        return box.getBoundingClientRect().top - top;
      });
      entryTops = entryEls.map((m) => {
        if (!m) return Infinity;
        const box = m.parentElement?.classList.contains("pin-spacer") ? m.parentElement : m;
        return box.getBoundingClientRect().top - top;
      });
    };
    const update = () => {
      frame = 0;
      const into = scrollTop - filmTop;
      const span = Math.max(1, filmHeight - viewHeight);
      const progress = Math.min(1, Math.max(0, into / span));
      const p = progress.toFixed(4);
      railRef.current?.style.setProperty("--film-progress", p);
      barRef.current?.style.setProperty("--film-progress", p);
      // Capítulo actual: el último cuya escena ya cruzó el 60 % de la ventana.
      let current = -1;
      chapterTops.forEach((t, i) => {
        if (into + viewHeight * 0.6 > t) current = i;
      });
      if (current !== chapterNow) setChapter(current);
      announce(current, Math.round(progress * 100) / 100);
      // La escena actual del riel temario y, si hay recorrido, su barra.
      const now = currentIndex(entryTops, into, viewHeight);
      if (now !== railNow) {
        railNow = now;
        setRailCurrent(now);
      }
      const trip = travelRef.current;
      if (trip && towardBarRef.current) {
        const k = Math.min(1, Math.max(0, (scrollTop - trip.from) / (trip.to - trip.from || 1)));
        towardBarRef.current.style.transform = `scaleX(${k.toFixed(3)})`;
      }
      const nowBeyond = into + viewHeight * 0.5 > nicheTop;
      const nowPast = into + viewHeight * 0.85 > afterTop;
      if (nowBeyond !== beyondHero || nowPast !== pastFilm) {
        beyondHero = nowBeyond;
        pastFilm = nowPast;
        sync();
      }
    };
    // El recorrido del riel temario: con el motor, un scrollTo de Lenis con
    // duración según la distancia (1,2–2,5 s) que pasa por las escenas, así sus
    // animaciones corren por el camino; sin motor (movimiento reducido), salto
    // directo. El destino es el de M1 (pin-spacer si se fija). Al llegar, el
    // foco va a la escena.
    travelTo.current = (entry) => {
      const target = root.querySelector<HTMLElement>(`#${CSS.escape(entry.id)}`);
      if (!target) return;
      const land = () => {
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      };
      const engine = engineRef.current;
      const to = engine?.offsetOf(`#${CSS.escape(entry.id)}`);
      if (!engine || to == null) {
        target.scrollIntoView({ behavior: "auto", block: "start" });
        land();
        return;
      }
      const from = el.scrollTop;
      const span = Math.max(1, filmHeight - viewHeight);
      travelRef.current = { from, to };
      setToward({ title: entry.title, tone: entry.tone, to: Math.min(1, Math.max(0, (to - filmTop) / span)) });
      engine.scrollTo(`#${CSS.escape(entry.id)}`, {
        duration: travelSeconds(to - from, viewHeight),
        easing: travelEase,
        onComplete: () => {
          travelRef.current = null;
          setToward(null);
          land();
        },
      });
    };
    // La píldora del nicho se aparta mientras se baja y vuelve al subir o al
    // quedar quieto 900 ms. Solo el sentido del scroll, sin medir el DOM; el CSS
    // decide que pase solo en móvil (film.css, data-hide).
    // Además se aparta, quieta o no, mientras algo marcado con `data-pill-avoid`
    // (la cabina del piloto) ocupa la franja de abajo de la pantalla: un
    // IntersectionObserver sobre esa franja, sin medir por frame.
    let hidden = false;
    let scrolling = false;
    let avoid = false;
    let rest = 0;
    const apply = () => {
      const on = scrolling || avoid;
      if (on === hidden) return;
      hidden = on;
      pillRef.current?.setAttribute("data-hide", on ? "true" : "false");
      syncPillInert(pillRef.current);
    };
    const setHidden = (on: boolean) => {
      scrolling = on;
      apply();
    };
    // `data-pill-avoid="always"` la aparta también en escritorio (data-avoid): la
    // onda de la llamada vive abajo al centro, donde está la píldora.
    const avoiding = new Set<Element>();
    let always = false;
    const pillIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) avoiding.add(e.target);
          else avoiding.delete(e.target);
        }
        avoid = avoiding.size > 0;
        const nowAlways = [...avoiding].some((n) => (n as HTMLElement).dataset.pillAvoid === "always");
        if (nowAlways !== always) {
          always = nowAlways;
          pillRef.current?.setAttribute("data-avoid", always ? "true" : "false");
          syncPillInert(pillRef.current);
        }
        apply();
      },
      { root: el, rootMargin: "-88% 0px 0px 0px" },
    );
    root.querySelectorAll("[data-pill-avoid]").forEach((n) => pillIo.observe(n));
    const onScroll = () => {
      const next = el.scrollTop;
      if (next !== scrollTop) setHidden(next > scrollTop);
      window.clearTimeout(rest);
      rest = window.setTimeout(() => setHidden(false), 900);
      scrollTop = next;
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };

    // `film:chapter` para la isla de la cabecera: solo cuando cambia algo.
    let chapterNow = -1;
    let announced = "";
    const announce = (index: number, progress: number) => {
      chapterNow = index;
      const key = `${index}|${progress}`;
      if (key === announced) return;
      announced = key;
      emitFilmEvent<FilmChapterDetail>(FILM_CHAPTER_EVENT, { chapter: TICKS[index] ?? null, index, total: TICKS.length, progress });
    };


    const ro = new ResizeObserver(() => {
      measure();
      update();
    });
    ro.observe(root);

    measure();
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      pillIo.disconnect();
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(rest);
    };
  }, []);

  // La película sigue el tema del sitio (claro, oscuro o sistema; lienzo del
  // modo claro, 2026-10-01): mismos componentes, otros tokens. El contenedor de
  // scroll pinta el fondo del tema para que el pie y los márgenes casen.
  useEffect(() => {
    const el = scroller();
    if (!el) return;
    // `film-scroller`: la barra de scroll en tinta mientras está la película (film.css).
    const added = ["bg-background", "text-foreground", "film-scroller"].filter((c) => !el.classList.contains(c));
    el.classList.add(...added);
    return () => el.classList.remove(...added);
  }, []);

  // El motor: diferido y opcional.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;
    let cancelled = false;
    // Lo que haga el visitante mientras baja el motor también cuenta: si entra
    // por /#medir y se mueve antes de que termine, el motor no lo devuelve al
    // ancla (ronda 2, R5).
    let moved = false;
    const onMove = () => {
      moved = true;
    };
    const start = () => {
      void import(/* webpackPrefetch: true */ "./engine/film-engine").then(({ startFilm }) => {
        if (cancelled || !rootRef.current) return;
        engineRef.current = startFilm(rootRef.current, { moved: () => moved });
      });
    };
    // El motor NO se evalúa durante la carga: era la tarea larga que más pesaba en
    // el TBT de Lighthouse móvil (auditoría). Sin motor el HTML ya es el
    // fotograma final, así que la primera pintura no cambia. Arranca con lo
    // primero que llegue:
    // - la primera intención del visitante (rueda, toque, clic, teclado o
    //   cualquier scroll del contenedor): la construcción va por tandas de
    //   arriba abajo, así la escena que asoma ya está montada cuando llega;
    // - en el acto si la página llega con un ancla o con el scroll ya
    //   restaurado (M1: el motor realinea el ancla al terminar);
    // - 2,5 s de reposo tras `load` y el primer hueco libre después (tope de 1 s).
    // El chunk se precarga (`webpackPrefetch`) para no esperar a la red al
    // primer giro de rueda. Antes arrancaba justo tras el primer pintado.
    const scroller = document.querySelector<HTMLElement>("[data-app-scroll]");
    let fired = false;
    const INTENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    const onScroll = () => {
      if (scroller && scroller.scrollTop > 0) go();
    };
    // Ids separados: cancelar un id de requestIdleCallback con clearTimeout
    // podía cancelar un temporizador ajeno con el mismo número (ronda 2, R10).
    let idle = 0;
    let timer = 0;
    const go = () => {
      if (fired) return;
      fired = true;
      for (const ev of INTENTS) window.removeEventListener(ev, go, true);
      scroller?.removeEventListener("scroll", onScroll);
      start();
    };
    for (const ev of INTENTS) window.addEventListener(ev, go, { capture: true, passive: true });
    // Con ancla el motor arranca en el acto: lo que llegue después es moverse.
    const hashed = Boolean(window.location.hash);
    if (hashed) for (const ev of INTENTS) window.addEventListener(ev, onMove, { capture: true, passive: true });
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    // requestIdleCallback solo no esperaba nada: con el cielo a 30 fps hay hueco
    // en cada frame y el motor entraba justo tras `load`, dentro de la ventana
    // de TBT (ronda 2, R3). Ahora: 2,5 s de reposo y después el primer hueco.
    const whenIdle = () => {
      timer = window.setTimeout(() => {
        timer = 0;
        if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(go, { timeout: 1000 });
        else go();
      }, ENGINE_REST_MS);
    };
    if (window.location.hash || (scroller && scroller.scrollTop > 0)) go();
    else if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });
    return () => {
      cancelled = true;
      for (const ev of INTENTS) window.removeEventListener(ev, go, true);
      scroller?.removeEventListener("scroll", onScroll);
      window.removeEventListener("load", whenIdle);
      for (const ev of INTENTS) window.removeEventListener(ev, onMove, true);
      if (idle && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      if (timer) window.clearTimeout(timer);
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []);

  const value = useMemo(() => ({ niche, choose, goTo }), [niche, choose, goTo]);
  const label = FILM_CONTENT[niche].label;

  return (
    <FilmContext.Provider value={value}>
      <div ref={rootRef} className="film" data-niche={niche} data-film="">
        {children}

        {/* El riel: el dibujo es decorativo; su botón y la ruleta (FilmDrum) no. Fuera de la vista, inerte. */}
        <div ref={railRef} className="film-rail" data-on={started} inert={!started}>
          <div className="track" aria-hidden="true" />
          <div className="lit" aria-hidden="true" />
          <div className="dot" aria-hidden="true" />
          {TICKS.map((t, i) => (
            <div key={t} className="tick" aria-hidden="true" data-on={i <= chapter} style={{ top: `${(i / (TICKS.length - 1)) * 100}%` }}>
              <i />
              <span>{t}</span>
            </div>
          ))}
          {railEntries.length ? <FilmDrum entries={railEntries} current={railCurrent} onTravel={(e) => travelTo.current?.(e)} /> : null}
          {toward ? (
            <div className="film-drum-toward" data-tone={toward.tone} style={{ "--to": toward.to } as React.CSSProperties} aria-live="polite">
              <i aria-hidden="true" />
              <small>{RAIL_COPY.toward}</small>
              <b>{toward.title}</b>
              <span className="film-drum-toward-bar" aria-hidden="true">
                <span ref={towardBarRef} />
              </span>
            </div>
          ) : null}
        </div>
        <div ref={barRef} className="film-bar" aria-hidden="true">
          <i />
        </div>

        <div ref={pillRef} className="film-pill" data-on={started}>
          <div className="film-glass flex h-11 items-center gap-2.5 rounded-full py-1 pr-1.5 pl-4 text-[13px]">
            <span className="film-dim max-lg:hidden">Viendo como</span>
            <strong className="font-semibold" aria-live="polite">
              {label}
            </strong>
            <button
              type="button"
              onClick={() => goTo("#quien")}
              className="film-chip h-8 cursor-pointer text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Cambiar
            </button>
          </div>
        </div>
      </div>
    </FilmContext.Provider>
  );
}
