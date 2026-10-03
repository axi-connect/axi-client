"use client";

import "./pieces.css";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { PIECES, PIECES_SCENE, type PieceId } from "@/modules/landing/ui/content/productos.content";
import { CatalogoScreen } from "./CatalogoScreen";
import { CobrosScreen } from "./CobrosScreen";
import { ConfiguraScreen } from "./ConfiguraScreen";
import { CrmScreen } from "./CrmScreen";
import { InboxScreen } from "./InboxScreen";
import { LlamadasScreen } from "./LlamadasScreen";
import { MedicionScreen } from "./MedicionScreen";

const SCREENS: Record<PieceId, () => ReactNode> = {
  inbox: InboxScreen,
  configura: ConfiguraScreen,
  catalogo: CatalogoScreen,
  crm: CrmScreen,
  llamadas: LlamadasScreen,
  cobros: CobrosScreen,
  medicion: MedicionScreen,
};

const IDS = PIECES.map((p) => p.id);
const isPiece = (id: unknown): id is PieceId => typeof id === "string" && (IDS as string[]).includes(id);

/**
 * Cómo se comporta la escena:
 * - `stack`: lo que llega en el HTML (sin JS, buscadores, antes de hidratar).
 *   Las siete piezas apiladas, cada una con su titular.
 * - `pinned`: escritorio. La escena queda fija y las pestañas avanzan con el
 *   scroll; un clic salta a la altura de esa pestaña, así scroll y pestaña
 *   nunca se contradicen.
 * - `tabs`: escritorio con movimiento reducido. Sin fijar; solo clic.
 * - `swipe`: móvil. Las piezas en fila con scroll-snap; se deslizan.
 */
type Mode = "stack" | "pinned" | "tabs" | "swipe";

/** Mientras dura un salto programado, el observador no cambia la pestaña. */
const LOCK_MS = 700;

function scroller(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-app-scroll]");
}

/**
 * «Pieza por pieza» (plan §4). El router de hash abre una pieza con el evento
 * `PIECES_SCENE.event`; al montar se lee también `location.hash`. Un cambio
 * de pestaña a mano reescribe el hash (sin scroll) para que el enlace se
 * pueda compartir.
 *
 * Sin GSAP ni Lenis: sticky + IntersectionObserver. NINGÚN wrapper de aquí
 * lleva overflow vertical: el sticky tiene que alcanzar `[data-app-scroll]`.
 */
export function ProductosPieces() {
  const [mode, setMode] = useState<Mode>("stack");
  const [active, setActive] = useState<PieceId>(IDS[0]);
  const modeRef = useRef<Mode>("stack");
  const pending = useRef<PieceId | null>(null);
  const lockUntil = useRef(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const sentinels = useRef<(HTMLDivElement | null)[]>([]);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const panels = useRef<(HTMLElement | null)[]>([]);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px) and (min-height: 600px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pick = () => {
      const next: Mode = wide.matches ? (reduce.matches ? "tabs" : "pinned") : "swipe";
      modeRef.current = next;
      setMode(next);
    };
    pick();
    wide.addEventListener("change", pick);
    reduce.addEventListener("change", pick);
    return () => {
      wide.removeEventListener("change", pick);
      reduce.removeEventListener("change", pick);
    };
  }, []);

  /** Lleva la vista a la pieza `id` según el modo, sin pasar por las demás. */
  const reveal = useCallback((id: PieceId) => {
    const index = IDS.indexOf(id);
    setActive(id);
    const current = modeRef.current;
    if (current === "stack") {
      pending.current = id;
      return;
    }
    lockUntil.current = Date.now() + LOCK_MS;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (current === "pinned") {
      const track = trackRef.current;
      const step = sentinels.current[index]?.offsetHeight ?? 0;
      if (!track) return;
      const el = scroller();
      const offset = track.getBoundingClientRect().top + index * step;
      if (el) el.scrollTo?.({ top: el.scrollTop + offset - el.getBoundingClientRect().top, behavior: "auto" });
      else window.scrollTo({ top: window.scrollY + offset, behavior: "auto" });
    }
    if (current === "swipe") {
      const strip = stripRef.current;
      const panel = panels.current[index];
      // La fila tiene padding lateral (el gutter de 16 px): el snap cae ahí.
      const gutter = strip ? parseFloat(getComputedStyle(strip).paddingLeft) || 0 : 0;
      if (strip && panel) strip.scrollTo?.({ left: panel.offsetLeft - gutter, behavior: reduced ? "auto" : "smooth" });
    }
  }, []);

  // Al montar, el hash; después, el router.
  useEffect(() => {
    const fromHash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (isPiece(fromHash)) pending.current = fromHash;
    const onPiece = (event: Event) => {
      const id = (event as CustomEvent<{ id?: unknown }>).detail?.id;
      if (isPiece(id)) reveal(id);
    };
    window.addEventListener(PIECES_SCENE.event, onPiece);
    return () => window.removeEventListener(PIECES_SCENE.event, onPiece);
  }, [reveal]);

  // En cuanto hay modo, se atiende lo que quedó pendiente.
  useEffect(() => {
    if (mode === "stack" || !pending.current) return;
    const id = pending.current;
    pending.current = null;
    reveal(id);
  }, [mode, reveal]);

  // Escritorio fijado: la pestaña es la del centinela que cruza la mitad de la pantalla.
  useEffect(() => {
    if (mode !== "pinned") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < lockUntil.current) return;
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.piece;
          if (entry.isIntersecting && isPiece(id)) setActive(id);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    sentinels.current.forEach((s) => s && observer.observe(s));
    return () => observer.disconnect();
  }, [mode]);

  // Móvil: la pestaña es la pieza que ocupa la fila.
  useEffect(() => {
    if (mode !== "swipe" || !stripRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < lockUntil.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting && isPiece(entry.target.id)) setActive(entry.target.id);
        }
      },
      { root: stripRef.current, threshold: 0.6 },
    );
    panels.current.forEach((p) => p && observer.observe(p));
    return () => observer.disconnect();
  }, [mode]);

  // Móvil: la pestaña activa queda a la vista dentro del dock (sin mover la página).
  useEffect(() => {
    if (mode !== "swipe") return;
    const dock = dockRef.current;
    const tab = tabs.current[IDS.indexOf(active)];
    if (dock && tab && dock.scrollWidth > dock.clientWidth) dock.scrollTo?.({ left: tab.offsetLeft - (dock.clientWidth - tab.clientWidth) / 2, behavior: "smooth" });
  }, [active, mode]);

  const choose = (id: PieceId) => {
    reveal(id);
    window.history.replaceState(window.history.state, "", `#${id}`);
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = IDS.indexOf(active);
    const next =
      event.key === "ArrowRight" ? (index + 1) % IDS.length
      : event.key === "ArrowLeft" ? (index - 1 + IDS.length) % IDS.length
      : event.key === "Home" ? 0
      : event.key === "End" ? IDS.length - 1
      : -1;
    if (next < 0) return;
    event.preventDefault();
    choose(IDS[next]);
    tabs.current[next]?.focus();
  };

  const tabbed = mode !== "stack";
  const current = PIECES.find((p) => p.id === active) ?? PIECES[0];

  return (
    <div className="pp" data-mode={mode}>
      <div ref={trackRef} className="pp-track">
        {mode === "pinned"
          ? IDS.map((id, i) => (
              <div
                key={id}
                ref={(el) => {
                  sentinels.current[i] = el;
                }}
                data-piece={id}
                className="pp-sentinel"
                style={{ top: `calc(${i} * var(--pp-step))` }}
                aria-hidden="true"
              />
            ))
          : null}
        <div className="pp-stage">
          <div className="pp-glow" data-tone={current.tone} aria-hidden="true" />
          <header className="pp-head">
            <h2 id="piezas-title" className="pj-eyebrow pp-eyebrow">
              {PIECES_SCENE.eyebrow}
            </h2>
            {tabbed ? (
              <p className="pj-h pj-h-lg pp-headline" aria-hidden="true" key={current.id}>
                {current.strong} <span className="t">{current.thin}</span>
              </p>
            ) : null}
            {tabbed ? (
              <span className="pp-sample" data-on={current.sample ? "" : undefined} aria-hidden="true">
                {PIECES_SCENE.sampleLabel}
              </span>
            ) : null}
          </header>

          {tabbed ? (
            <div ref={dockRef} className="pp-dock" role="tablist" aria-label={PIECES_SCENE.tablistLabel} onKeyDown={onKey}>
              {PIECES.map((piece, i) => (
                <button
                  key={piece.id}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`pp-tab-${piece.id}`}
                  aria-selected={piece.id === active}
                  aria-controls={piece.id}
                  tabIndex={piece.id === active ? 0 : -1}
                  data-tone={piece.tone}
                  onClick={() => choose(piece.id)}
                >
                  <span className="pp-dot" aria-hidden="true" />
                  {piece.tab}
                </button>
              ))}
            </div>
          ) : null}

          <div ref={stripRef} className="pp-frame">
            {PIECES.map((piece, i) => {
              const Screen = SCREENS[piece.id];
              const on = piece.id === active;
              const hide = (mode === "pinned" || mode === "tabs") && !on;
              return (
                <section
                  key={piece.id}
                  ref={(el) => {
                    panels.current[i] = el;
                  }}
                  id={piece.id}
                  className="pp-panel"
                  data-tone={piece.tone}
                  data-on={on ? "" : undefined}
                  role={tabbed ? "tabpanel" : undefined}
                  aria-labelledby={tabbed ? `pp-tab-${piece.id}` : `pp-h-${piece.id}`}
                  inert={hide}
                >
                  <div className="pp-panel-head">
                    <h3 id={`pp-h-${piece.id}`} className="pj-h pj-h-lg">
                      {piece.strong} <span className="t">{piece.thin}</span>
                    </h3>
                    {piece.sample ? <span className="pp-sample" data-on="">{PIECES_SCENE.sampleLabel}</span> : null}
                  </div>
                  <div className="pp-screen">
                    <Screen />
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
