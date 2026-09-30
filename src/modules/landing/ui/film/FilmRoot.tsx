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

type Engine = { stop(): void; scrollTo(target: string): void };

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

export function FilmRoot({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [niche, setNiche] = useState<FilmNiche>(DEFAULT_FILM_NICHE);
  const [started, setStarted] = useState(false);
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

  const goTo = useCallback((target: string) => {
    if (engineRef.current) return engineRef.current.scrollTo(target);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector(target)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
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

  // Guía de progreso y píldora: un listener pasivo que escribe una variable CSS.
  useEffect(() => {
    const el = scroller();
    const root = rootRef.current;
    if (!el || !root) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      const viewport = el.clientHeight;
      const span = Math.max(1, rect.height - viewport);
      const progress = Math.min(1, Math.max(0, -rect.top / span));
      root.style.setProperty("--film-progress", progress.toFixed(4));
      // Visible durante la película: ni en el hero ni desde los precios (ahí
      // la escena ya no depende del nicho y la píldora taparía las tarjetas).
      const after = root.querySelector<HTMLElement>('[data-scene="pricing"]');
      const reachedAfter = after ? after.getBoundingClientRect().top < viewport * 0.85 : false;
      setStarted(-rect.top > viewport * 1.2 && !reachedAfter);
      const marks = TICKS.map((t) => root.querySelector<HTMLElement>(`[data-chapter="${t}"]`));
      let current = -1;
      marks.forEach((m, i) => {
        if (m && m.getBoundingClientRect().top < viewport * 0.6) current = i;
      });
      setChapter(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Toda la home va en el escenario oscuro mientras la película está montada:
  // el contenedor de scroll lleva los tokens oscuros, así el pie y el margen
  // que lo separa de la película no quedan claros. La cabecera lo hace sola en
  // `/` (SiteHeader), para no esperar a la hidratación.
  useEffect(() => {
    const el = scroller();
    if (!el) return;
    const added = ["dark", "theme-dark-island", "bg-background", "text-foreground"].filter((c) => !el.classList.contains(c));
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
    const start = () => {
      void import("./engine/film-engine").then(({ startFilm }) => {
        if (cancelled || !rootRef.current) return;
        engineRef.current = startFilm(rootRef.current);
      });
    };
    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(start, { timeout: 1500 })
        : window.setTimeout(start, 400);
    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle as number);
      else window.clearTimeout(idle as number);
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []);

  const value = useMemo(() => ({ niche, choose, goTo }), [niche, choose, goTo]);
  const label = FILM_CONTENT[niche].label;

  return (
    <FilmContext.Provider value={value}>
      <div ref={rootRef} className="film dark theme-dark-island" data-niche={niche} data-film="">
        {children}

        <div className="film-rail" data-on={started} aria-hidden="true">
          <div className="track" />
          <div className="lit" />
          <div className="dot" />
          {TICKS.map((t, i) => (
            <div key={t} className="tick" data-on={i <= chapter} style={{ top: `${(i / (TICKS.length - 1)) * 100}%` }}>
              <i />
              <span>{t}</span>
            </div>
          ))}
        </div>
        <div className="film-bar" aria-hidden="true">
          <i />
        </div>

        <div className="film-pill" data-on={started}>
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
