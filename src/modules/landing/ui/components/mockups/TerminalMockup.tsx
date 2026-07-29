"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

import { cn } from "@/core/lib/utils";

export interface TerminalStep {
  cmd: string;
  results: ReadonlyArray<string>;
}

interface TerminalLine {
  text: string;
  kind: "cmd" | "ok" | "muted" | "spacer";
}

/**
 * Ventana de terminal que "escribe" la venta paso a paso (sección
 * "El futuro es conversacional"). El typing arranca al entrar en viewport,
 * una sola vez; con reduced-motion se muestra el transcript completo.
 *
 * La superficie es oscura en ambos temas (es una terminal): la sección la
 * envuelve en un wrapper `dark`, aquí solo se consumen tokens.
 */
export function TerminalMockup({
  windowTitle,
  prompt,
  script,
  className,
}: {
  windowTitle: string;
  prompt: string;
  script: ReadonlyArray<TerminalStep>;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const outRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(outRef, { once: true, amount: 0.35 });
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [typing, setTyping] = useState<string | null>(null);
  const started = useRef(false);

  /* Transcript completo, para reduced-motion y para el aria-label. */
  const fullTranscript = (): TerminalLine[] =>
    script.flatMap((step) => [
      { text: prompt + step.cmd, kind: "cmd" as const },
      ...step.results.map((r, i) => ({ text: r, kind: i === 0 ? ("ok" as const) : ("muted" as const) })),
      { text: " ", kind: "spacer" as const },
    ]);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;

    if (reduced) {
      setLines(fullTranscript());
      return;
    }

    let dead = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => !dead && fn(), ms);
      timers.push(t);
    };

    const typeStep = (stepIndex: number) => {
      if (stepIndex >= script.length) {
        setTyping(null);
        return;
      }
      const step = script[stepIndex];
      let i = 0;
      const tick = () => {
        setTyping(prompt + step.cmd.slice(0, i));
        if (i < step.cmd.length) {
          i++;
          later(tick, 26 + Math.random() * 26);
        } else {
          setLines((prev) => [...prev, { text: prompt + step.cmd, kind: "cmd" }]);
          setTyping(null);
          const emitResult = (ri: number) => {
            if (ri < step.results.length) {
              setLines((prev) => [
                ...prev,
                { text: step.results[ri], kind: ri === 0 ? "ok" : "muted" },
              ]);
              later(() => emitResult(ri + 1), 220);
            } else {
              setLines((prev) => [...prev, { text: " ", kind: "spacer" }]);
              later(() => typeStep(stepIndex + 1), 700);
            }
          };
          later(() => emitResult(0), 320);
        }
      };
      tick();
    };
    typeStep(0);

    return () => {
      dead = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced]);

  /* Auto-scroll al fondo mientras escribe. */
  useEffect(() => {
    const el = outRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, typing]);

  return (
    <div
      className={cn(
        "border-border bg-background overflow-hidden rounded-2xl border shadow-overlay",
        className,
      )}
    >
      {/* Barra de la terminal */}
      <div className="border-border/70 bg-secondary/60 flex items-center gap-2.5 border-b px-4 py-3">
        <span aria-hidden className="bg-brand size-[11px] rounded-full" />
        <span aria-hidden className="bg-accent-amber size-[11px] rounded-full" />
        <span aria-hidden className="bg-success size-[11px] rounded-full" />
        <span className="text-muted-foreground flex-1 text-center font-mono text-xs">
          {windowTitle}
        </span>
        <span aria-hidden className="w-11" />
      </div>

      <div
        ref={outRef}
        role="log"
        aria-live="off"
        aria-label={script.map((s) => `${s.cmd}. ${s.results.join(". ")}`).join(" ")}
        className="h-[340px] overflow-hidden px-5 py-4 font-mono text-[13px] leading-[1.75]"
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "whitespace-pre-wrap",
              line.kind === "cmd" && "text-foreground font-medium",
              line.kind === "ok" && "text-success",
              line.kind === "muted" && "text-muted-foreground",
              line.kind === "spacer" && "text-transparent",
            )}
          >
            {line.text}
          </div>
        ))}
        {typing !== null && (
          <div className="text-foreground font-medium whitespace-pre-wrap">
            {typing}
            <span aria-hidden className="bg-foreground/70 ml-0.5 inline-block h-[1em] w-[7px] translate-y-[2px]" />
          </div>
        )}
      </div>
    </div>
  );
}
