"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CornerDownRight, Plus, Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";

/** Una tarjeta de punto de partida: lo que axi sugiere hoy; la Biblioteca de Meta llega en F5. */
export interface StartOption {
  key: string;
  title: string;
  body: string;
}

const CARD_GAP_PX = 10;

/**
 * «Empieza desde» (maqueta F0 v3): una sola fila a todo el ancho, encima de las
 * dos columnas. Sin barra de desplazamiento: desvanecidos al principio y al
 * final —solo donde queda contenido— y dos flechas que pasan una página de
 * tarjetas; se sigue pudiendo deslizar con el dedo o el trackpad.
 *
 * Elegir pliega la fila a una línea («Empezaste en blanco · Cambiar»): el punto
 * de partida se decide una vez y no debe seguir ocupando la página.
 */
export function StartStrip({
  options,
  picked,
  collapsed,
  onPickBlank,
  onPick,
  onExpand,
}: {
  options: readonly StartOption[];
  /** `null` en blanco; si no, la `key` de la sugerida elegida. */
  picked: string | null;
  collapsed: boolean;
  onPickBlank: () => void;
  onPick: (key: string) => void;
  onExpand: () => void;
}) {
  if (collapsed) {
    const origin = picked === null ? null : options.find((option) => option.key === picked)?.title;
    return (
      <p className="text-muted-foreground flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
        <CornerDownRight aria-hidden="true" className="size-3.5 shrink-0" />
        <span>
          Empezaste{" "}
          <span className="text-foreground font-medium">{origin ? `desde «${origin}»` : "en blanco"}</span>
        </span>
        <button
          type="button"
          onClick={onExpand}
          className="text-foreground decoration-border hover:decoration-foreground min-h-6 font-medium underline underline-offset-[3px] transition-colors"
        >
          Cambiar
        </button>
      </p>
    );
  }

  return (
    <section aria-labelledby="hsm-start-title" className="flex min-w-0 flex-col gap-3">
      <Carousel
        title={
          <h2 id="hsm-start-title" className="text-[15px] font-semibold">
            Empieza desde
          </h2>
        }
      >
        <StartCard pressed={picked === null} onClick={onPickBlank} dashed>
          <Plus aria-hidden="true" className="size-4.5" />
          <span className="text-[13.5px] font-semibold">En blanco</span>
          <span className="text-muted-foreground text-xs">Escribe la tuya desde cero</span>
        </StartCard>
        {options.map((option) => (
          <StartCard key={option.key} pressed={picked === option.key} onClick={() => onPick(option.key)}>
            <span className="text-muted-foreground flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.07em] uppercase">
              <Sparkles aria-hidden="true" className="text-accent-violet size-3" />
              axi sugiere
            </span>
            <span className="text-[13.5px] font-semibold">{option.title}</span>
            <span className="text-muted-foreground line-clamp-2 text-xs">«{option.body}»</span>
          </StartCard>
        ))}
      </Carousel>
    </section>
  );
}

function StartCard({
  pressed,
  onClick,
  dashed = false,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "bg-card flex w-[13.75rem] shrink-0 snap-start flex-col items-start gap-1.5 rounded-[18px] border px-3.5 py-3 text-left transition-colors",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
        dashed && "border-dashed",
        pressed ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/30",
      )}
    >
      {children}
    </button>
  );
}

/**
 * La fila desplazable, sin barra. Los desvanecidos se dibujan con una máscara y
 * solo donde queda contenido; las flechas se apagan en cada extremo. Al llegar
 * con el teclado a una tarjeta tapada, el navegador la desplaza a la vista.
 */
function Carousel({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const sync = useCallback(() => {
    const row = rowRef.current;
    if (row === null) return;
    setEdges({
      start: row.scrollLeft <= 2,
      end: row.scrollLeft + row.clientWidth >= row.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (row === null) return;
    sync();
    // jsdom (los tests) no tiene ResizeObserver: sin él, las flechas se calculan al desplazar
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(row);
    return () => observer.disconnect();
  }, [sync]);

  function page(direction: 1 | -1) {
    const row = rowRef.current;
    if (row === null) return;
    const card = row.firstElementChild;
    const width = card ? card.getBoundingClientRect().width + CARD_GAP_PX : row.clientWidth;
    const perPage = Math.max(1, Math.floor(row.clientWidth / width));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollBy({ left: direction * perPage * width, behavior: reduce ? "auto" : "smooth" });
  }

  const fadeStart = edges.start ? "0px" : "3rem";
  const fadeEnd = edges.end ? "0px" : "3rem";
  const mask = `linear-gradient(to right, transparent 0, #000 ${fadeStart}, #000 calc(100% - ${fadeEnd}), transparent 100%)`;
  const scrollable = !(edges.start && edges.end);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {title}
        {scrollable ? (
          <div className="flex gap-1.5">
            <ArrowButton label="Anteriores" disabled={edges.start} onClick={() => page(-1)}>
              <ChevronLeft aria-hidden="true" className="size-4" />
            </ArrowButton>
            <ArrowButton label="Siguientes" disabled={edges.end} onClick={() => page(1)}>
              <ChevronRight aria-hidden="true" className="size-4" />
            </ArrowButton>
          </div>
        ) : null}
      </div>
      <div
        ref={rowRef}
        onScroll={sync}
        role="group"
        aria-label="Puntos de partida"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        className="flex snap-x snap-proximity gap-2.5 overflow-x-auto p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="border-border bg-card hover:bg-secondary grid size-8 place-items-center rounded-full border transition-opacity disabled:cursor-default disabled:opacity-35 disabled:hover:bg-card focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {children}
    </button>
  );
}
