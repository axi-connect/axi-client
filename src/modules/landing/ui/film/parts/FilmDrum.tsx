"use client";

import "../film-drum.css";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

import { RAIL_COPY, clampIndex, drumPose, wheelStep, type RailEntry } from "@/modules/landing/domain/film/rail-index";

/**
 * La ruleta del riel (lienzo «Landing · Riel temario» v2, aprobado el
 * 2026-10-01). Vive dentro del riel de FilmRoot:
 *
 * - Se abre al pasar el ratón por el riel o con el teclado desde su botón
 *   (entonces el foco va a la escena del centro). Nace del punto actual del
 *   riel con escala, opacidad y desenfoque: solo en la entrada.
 * - Mientras está abierta, la rueda mueve la ruleta y NO la página (un paso
 *   cada 60 px; `data-lenis-prevent` y un `wheel` no pasivo). ↑ ↓ igual.
 * - Intro o clic en una escena inicia el recorrido (`onTravel`, FilmRoot).
 *   Esc cierra y devuelve el foco al botón del riel.
 * - Solo transform y opacity en las filas.
 */
export function FilmDrum({
  entries,
  current,
  onTravel,
}: {
  entries: readonly RailEntry[];
  /** La escena en pantalla (índice en `entries`). */
  current: number;
  onTravel: (entry: RailEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(current);
  const zoneRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const acc = useRef(0);
  const focusOnOpen = useRef(false);
  const id = useId();

  const show = (viaKeyboard: boolean) => {
    if (open) return;
    setSel(current);
    acc.current = 0;
    focusOnOpen.current = viaKeyboard;
    setOpen(true);
  };
  const hide = (refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  // Abierta con el teclado: el foco entra a la escena del centro.
  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    listRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
  }, [open]);

  // La rueda mueve la ruleta y no la página mientras está abierta.
  useEffect(() => {
    const zone = zoneRef.current;
    if (!open || !zone) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const r = wheelStep(acc.current, e.deltaY);
      acc.current = r.acc;
      if (r.steps) setSel((s) => clampIndex(s + r.steps, entries.length));
    };
    zone.addEventListener("wheel", onWheel, { passive: false });
    return () => zone.removeEventListener("wheel", onWheel);
  }, [open, entries.length]);

  const move = (to: number) => {
    const next = clampIndex(to, entries.length);
    setSel(next);
    // El foco sigue a la selección (es UNA parada de tabulación: tabIndex 0 solo en ella).
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus());
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      move(sel + (e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      move(e.key === "Home" ? 0 : entries.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      hide(true);
    }
  };
  const go = (k: number) => {
    setOpen(false);
    onTravel(entries[k]);
  };

  return (
    <div
      ref={zoneRef}
      className="film-drum-zone"
      data-lenis-prevent=""
      onMouseEnter={() => show(false)}
      onMouseLeave={() => {
        if (!zoneRef.current?.contains(document.activeElement)) hide(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={onKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        className="film-drum-trigger"
        aria-label={RAIL_COPY.open}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? hide(false) : show(true))}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            // Que la zona no la mueva también un paso.
            e.stopPropagation();
            show(true);
          }
        }}
      />
      <nav id={id} className="film-drum" aria-label={RAIL_COPY.label} data-open={open ? "" : undefined} inert={!open}>
        <span className="film-drum-band" aria-hidden="true" />
        <div ref={listRef} className="film-drum-list">
          {entries.map((e, k) => {
            const p = drumPose(k - sel);
            const centered = k === sel;
            const style: CSSProperties = {
              transform: `translateY(${p.y}px) scale(${p.scale.toFixed(3)})`,
              opacity: Number(p.opacity.toFixed(3)),
              visibility: p.hidden ? "hidden" : undefined,
            };
            return (
              <button
                key={e.id}
                type="button"
                className="film-drum-row"
                data-index={k}
                data-tone={e.tone}
                data-centered={centered ? "" : undefined}
                tabIndex={centered ? 0 : -1}
                aria-current={k === current ? "step" : undefined}
                style={style}
                onClick={() => (centered ? go(k) : setSel(k))}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    go(k);
                  }
                }}
              >
                <i className="film-drum-dot" aria-hidden="true" />
                <span className="film-drum-text">
                  <span className="film-drum-chapter">{e.chapter}</span>
                  <span className="film-drum-title">{e.title}</span>
                </span>
                <span className="film-drum-key" aria-hidden="true">
                  ↵
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
