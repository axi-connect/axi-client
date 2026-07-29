"use client";

import { useCallback, useEffect, useRef } from "react";

import { cn } from "@/core/lib/utils";

/**
 * Tarjeta interactiva de la bóveda (§5): al pasar el cursor, una máscara
 * radial revela un gradiente coral→violeta y "los datos del negocio"
 * (vocabulario del catálogo en Geist Mono) — la metáfora de que cada
 * conversación pasa por el sistema, no por la imaginación de un modelo.
 *
 * Manipula el DOM por refs (máscara + texto se regeneran por pointermove);
 * el estado de React no participa a propósito. En touch, un tap alterna el
 * reveal centrado. Es hover-driven: no hay loop, así que reduced-motion no
 * requiere rama propia.
 */
export function VaultRevealCard({
  hint,
  vocabulary,
  className,
}: {
  /** Texto del círculo central ("pásale el cursor"). */
  hint: string;
  /** Vocabulario del catálogo con el que se rellenan las capas de datos. */
  vocabulary: string;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const charsRef = useRef<HTMLDivElement | null>(null);
  const revealedByTap = useRef(false);

  const randomChunk = useCallback(() => {
    let s = "";
    while (s.length < 2200) s += vocabulary.slice(Math.floor(Math.random() * 40));
    return s.slice(0, 2200);
  }, [vocabulary]);

  /* El texto inicial se pinta en cliente (evita mismatch de hidratación). */
  useEffect(() => {
    if (charsRef.current) charsRef.current.textContent = randomChunk();
  }, [randomChunk]);

  const applyMask = (x: number, y: number) => {
    const mask = `radial-gradient(240px at ${x}px ${y}px, white, transparent)`;
    for (const layer of [glowRef.current, charsRef.current]) {
      if (!layer) continue;
      layer.style.maskImage = mask;
      layer.style.webkitMaskImage = mask;
    }
  };

  const setRevealed = (on: boolean) => {
    for (const layer of [glowRef.current, charsRef.current]) {
      if (layer) layer.style.opacity = on ? "1" : "0";
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    applyMask(e.clientX - r.left, e.clientY - r.top);
    if (charsRef.current) charsRef.current.textContent = randomChunk();
  };

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    /* Touch/teclado: alterna el reveal centrado. */
    const r = e.currentTarget.getBoundingClientRect();
    revealedByTap.current = !revealedByTap.current;
    applyMask(r.width / 2, r.height / 2);
    setRevealed(revealedByTap.current);
  };

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={hint}
      onPointerMove={onPointerMove}
      onPointerEnter={(e) => e.pointerType === "mouse" && setRevealed(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && !revealedByTap.current && setRevealed(false)}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          revealedByTap.current = !revealedByTap.current;
          const r = e.currentTarget.getBoundingClientRect();
          applyMask(r.width / 2, r.height / 2);
          setRevealed(revealedByTap.current);
        }
      }}
      className={cn(
        "bg-background focus-visible:ring-ring relative flex min-h-[300px] flex-1 cursor-crosshair items-center justify-center overflow-hidden rounded-[22px] focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      {/* Capa de gradiente coral→violeta revelada por la máscara */}
      <div
        ref={glowRef}
        aria-hidden
        className="absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{ background: "linear-gradient(120deg, var(--axi-brand), var(--axi-violet))" }}
      />
      {/* Capa de "datos del negocio" (vocabulario del catálogo) */}
      <div
        ref={charsRef}
        aria-hidden
        className="text-foreground absolute inset-0 overflow-hidden p-0.5 font-mono text-[11px] leading-tight font-semibold break-all whitespace-pre-wrap opacity-0 mix-blend-overlay transition-opacity duration-300"
      />
      {/* Círculo central con la invitación */}
      <div className="bg-background/70 relative z-[2] flex size-[168px] items-center justify-center rounded-full backdrop-blur-[6px]">
        <span className="font-heading text-foreground px-5 text-center text-[17px] leading-snug font-bold tracking-wide">
          {hint}
        </span>
      </div>
    </div>
  );
}
