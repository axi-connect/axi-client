"use client";

/**
 * `/overview`: la presentación comercial pública (docs/plans/overview_deck_plan.md, maqueta aprobada en
 * docs/design/mockups/overview-deck/). La única isla cliente de la ruta.
 *
 * - Navegación: ← → Espacio Inicio Fin en el teclado; deslizar o tocar a los lados en el celular. La lámina va en el
 *   hash (`#integraciones`) para compartir una exacta.
 * - Guion del vendedor (N), índice (G) y pantalla completa (F).
 * - Diagnóstico en la URL (`?caso=tarde,excel`) y «preparado para» desde `?para=`: todo en el cliente, así la página
 *   sigue siendo estática y no le pide nada al servidor de Axi.
 * - Pantalla o celular por la orientación: en vertical se sirven los clips 4:5 del teléfono, sin marco.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, Maximize, ScrollText, X } from "lucide-react";

import { BrandLockup } from "@/shared/components/ui/brand-lockup";

import { sanitizeCompany } from "../domain/company";
import { markedSlideCount, parseCases, respondsTo, serializeCases, toggleCase, type CaseTag } from "../domain/diagnosis";
import type { ClipFormat } from "../domain/media";
import type { PlansView } from "../domain/plans";
import { SLIDES, slideIndexById, type Slide } from "../domain/slides";
import {
  ClipMedia,
  Closing,
  Cover,
  DiagnosisPanel,
  IntegrationsHub,
  Pillars,
  Plans,
  Problems,
  RouteSteps,
  Subtitle,
} from "./parts";

const PORTRAIT_QUERY = "(orientation: portrait) and (max-width: 1024px)";
const LEAVE_MS = 320;
const pad = (n: number) => String(n).padStart(2, "0");

type Props = {
  plans: PlansView | null;
  whatsappUrl: string;
  whatsappLabel: string;
  /** Origen alterno de los clips (verificación local); por defecto, Cloudinary. */
  mediaBase: string | null;
};

export function OverviewDeck({ plans, whatsappUrl, whatsappLabel, mediaBase }: Props) {
  const total = SLIDES.length;
  const [cur, setCur] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [cases, setCases] = useState<CaseTag[]>([]);
  const [company, setCompany] = useState<string | null>(null);
  const [format, setFormat] = useState<ClipFormat>("pantalla");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [notesOn, setNotesOn] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const indexButton = useRef<HTMLButtonElement>(null);
  const indexDialog = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<number | undefined>(undefined);
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);

  // Estado inicial desde la URL y el dispositivo (solo en el cliente: la página es estática)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCases(parseCases(params.get("caso")));
    setCompany(sanitizeCompany(params.get("para")));
    const fromHash = slideIndexById(window.location.hash.slice(1));
    if (fromHash >= 0) setCur(fromHash);

    const portrait = window.matchMedia(PORTRAIT_QUERY);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setFormat(portrait.matches ? "celular" : "pantalla");
      setReducedMotion(reduce.matches);
    };
    sync();
    portrait.addEventListener("change", sync);
    reduce.addEventListener("change", sync);
    const onHash = () => {
      const i = slideIndexById(window.location.hash.slice(1));
      if (i >= 0) setCur(i);
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      portrait.removeEventListener("change", sync);
      reduce.removeEventListener("change", sync);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  /** URL compartible: lámina en el hash, diagnóstico y empresa en la consulta. Sin recargar ni tocar el historial. */
  const writeUrl = useCallback((index: number, nextCases: readonly CaseTag[]) => {
    const url = new URL(window.location.href);
    const caso = serializeCases(nextCases);
    if (caso) url.searchParams.set("caso", caso);
    else url.searchParams.delete("caso");
    url.hash = SLIDES[index].id;
    window.history.replaceState(null, "", url);
  }, []);

  const go = useCallback(
    (target: number) => {
      const next = Math.max(0, Math.min(total - 1, target));
      if (next === cur) return;
      setLeaving(cur);
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = window.setTimeout(() => setLeaving(null), LEAVE_MS);
      setCur(next);
      writeUrl(next, cases);
    },
    [cur, total, cases, writeUrl],
  );
  const next = useCallback(() => go(cur + 1), [go, cur]);
  const back = useCallback(() => go(cur - 1), [go, cur]);
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const onToggleCase = useCallback(
    (tag: CaseTag) => {
      const updated = toggleCase(cases, tag);
      setCases(updated);
      writeUrl(cur, updated);
    },
    [cases, cur, writeUrl],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const openIndex = useCallback(() => setIndexOpen(true), []);
  const closeIndex = useCallback(() => {
    setIndexOpen(false);
    indexButton.current?.focus();
  }, []);
  useEffect(() => {
    if (!indexOpen) return;
    const current = indexDialog.current?.querySelector<HTMLButtonElement>("[aria-current='true']");
    (current ?? indexDialog.current?.querySelector<HTMLButtonElement>("button"))?.focus();
  }, [indexOpen]);

  // Teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (indexOpen) {
        if (e.key === "Escape") closeIndex();
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          back();
          break;
        case "Home":
          go(0);
          break;
        case "End":
          go(total - 1);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "g":
        case "G":
          openIndex();
          break;
        case "n":
        case "N":
          setNotesOn((on) => !on);
          break;
        case "Escape":
          setNotesOn(false);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [indexOpen, closeIndex, next, back, go, total, toggleFullscreen, openIndex]);

  // Deslizar y tocar: a la izquierda (30 %) vuelve, el resto avanza; los controles no cuentan
  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  };
  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || (e.target as HTMLElement).closest("button, a, input, [role='dialog']")) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) next();
      else back();
      return;
    }
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && e.timeStamp - start.t < 400) {
      const box = e.currentTarget.getBoundingClientRect();
      if (e.clientX - box.left < box.width * 0.3) back();
      else next();
    }
  };

  const marked = useMemo(() => SLIDES.map((slide) => respondsTo(slide, cases)), [cases]);
  const markedCount = useMemo(() => markedSlideCount(cases), [cases]);
  const slide = SLIDES[cur];

  const body = (s: Slide, i: number) => {
    const active = i === cur;
    const near = Math.abs(i - cur) <= 1;
    switch (s.kind) {
      case "cover":
        return <Cover slide={s} company={company} reducedMotion={reducedMotion} />;
      case "closing":
        return <Closing slide={s} whatsappUrl={whatsappUrl} whatsappLabel={whatsappLabel} />;
      default:
        return (
          <>
            <Subtitle slide={s} marked={marked[i]} />
            {s.kind === "clip" && s.clip ? (
              <ClipMedia
                clip={s.clip}
                format={format}
                label={`${s.title}: la app real de Axi`}
                active={active}
                near={near}
                reducedMotion={reducedMotion}
                mediaBase={mediaBase}
              />
            ) : null}
            {s.kind === "diagnosis" ? <DiagnosisPanel cases={cases} onToggle={onToggleCase} markedCount={markedCount} /> : null}
            {s.kind === "problem" ? <Problems /> : null}
            {s.kind === "pillars" ? <Pillars /> : null}
            {s.kind === "integrations" ? <IntegrationsHub /> : null}
            {s.kind === "route" ? <RouteSteps /> : null}
            {s.kind === "plans" ? <Plans plans={plans} /> : null}
          </>
        );
    }
  };

  return (
    <div className="ov-deck" data-format={format}>
      <div className="ov-bg" aria-hidden="true" />
      <header className="ov-top">
        <BrandLockup size="sm" />
        <div className="ov-tools">
          <span className="ov-count" aria-live="polite" aria-atomic="true">
            <span className="sr-only">Lámina </span>
            {pad(cur + 1)} / {pad(total)}
          </span>
          <button type="button" className="ov-tool" aria-pressed={notesOn} onClick={() => setNotesOn((on) => !on)} title="Guion del vendedor (N)">
            <ScrollText aria-hidden="true" />
            <span className="ov-tool-label">Guion</span>
            <kbd>N</kbd>
          </button>
          <button ref={indexButton} type="button" className="ov-tool" onClick={openIndex} title="Índice (G)" aria-haspopup="dialog">
            <LayoutGrid aria-hidden="true" />
            <span className="ov-tool-label">Índice</span>
            <kbd>G</kbd>
          </button>
          <button type="button" className="ov-tool ov-tool--full" onClick={toggleFullscreen} title="Pantalla completa (F)" aria-label="Pantalla completa">
            <Maximize aria-hidden="true" />
            <kbd>F</kbd>
          </button>
        </div>
      </header>

      <main
        className="ov-stage"
        aria-roledescription="presentación"
        aria-label="Axi Connect"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {SLIDES.map((s, i) => (
          <section
            key={s.id}
            id={`lamina-${s.id}`}
            className="ov-slide"
            data-kind={s.kind}
            data-state={i === cur ? "active" : i === leaving ? "leaving" : undefined}
            aria-roledescription="lámina"
            aria-label={`${i + 1} de ${total}: ${s.title}`}
            aria-hidden={i !== cur}
            inert={i !== cur}
          >
            {body(s, i)}
          </section>
        ))}
      </main>

      <footer className="ov-foot">
        <nav className="ov-progress" aria-label="Láminas">
          <div className="ov-track" />
          <div className="ov-fill" style={{ width: `${(cur / (total - 1)) * 100}%` }} />
          <ol className="ov-dots">
            {SLIDES.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="ov-dot"
                  data-done={i < cur ? "" : undefined}
                  data-marked={marked[i] && i !== cur ? "" : undefined}
                  aria-current={i === cur ? "step" : undefined}
                  aria-label={`Ir a ${s.title}${marked[i] ? " (tu caso)" : ""}`}
                  onClick={() => go(i)}
                />
              </li>
            ))}
          </ol>
        </nav>
        <div className="ov-nav">
          <button type="button" onClick={back} disabled={cur === 0} aria-label="Lámina anterior">
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" onClick={next} disabled={cur === total - 1} aria-label="Lámina siguiente">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </footer>

      {notesOn ? (
        <aside className="ov-notes" aria-live="polite" aria-label="Guion del vendedor">
          <div className="ov-notes-label">
            <span>Guion del vendedor</span>
            <span>
              {pad(cur + 1)} · {slide.title}
            </span>
          </div>
          <p>{slide.note}</p>
        </aside>
      ) : null}

      {indexOpen ? (
        <div
          className="ov-index"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ov-index-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeIndex();
          }}
        >
          <div className="ov-index-card" ref={indexDialog}>
            <div className="ov-index-head">
              <h2 id="ov-index-title">Recorrido</h2>
              <button type="button" className="ov-tool" onClick={closeIndex}>
                <X aria-hidden="true" />
                Cerrar <kbd>Esc</kbd>
              </button>
            </div>
            <div className="ov-index-grid">
              {SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className="ov-ix"
                  aria-current={i === cur ? "true" : undefined}
                  data-marked={marked[i] ? "" : undefined}
                  onClick={() => {
                    closeIndex();
                    go(i);
                  }}
                >
                  <span className="ov-ix-n">{pad(i + 1)}</span>
                  <span className="ov-ix-t">{s.title}</span>
                  <span className="ov-ix-c" aria-hidden="true" />
                  {marked[i] ? <span className="sr-only"> (tu caso)</span> : null}
                </button>
              ))}
            </div>
            <p className="ov-index-legend">Señaladas: responden a lo que marcaste en el diagnóstico.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
