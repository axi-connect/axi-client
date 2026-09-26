"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/core/lib/utils";
import { formatDuration } from "@/core/lib/format";
import { readAuraPalette } from "../aura/aura-renderer";
import { drawWaveform, type WaveformSpan } from "./waveform-renderer";

type Frame = {
  peaks: readonly number[] | null;
  spans: readonly WaveformSpan[];
  progress: number;
};

/**
 * La onda de la grabación (premium F2): picos reales del audio, coloreados
 * por quién habla en lo ya sonado (violeta el agente, coral el cliente) y
 * apagados en lo que falta; cursor blanco. Vive sobre una superficie de tinta
 * (`.surface-dark`), de donde salen los colores. El control accesible es un
 * `input range` invisible encima del canvas: teclado y lector de pantalla
 * mueven la grabación igual que el ratón. Sin picos (`peaks=null`, p. ej. el
 * storage no permite CORS) dibuja una línea casi plana y todo lo demás sigue.
 */
export function RecordingWaveform({
  peaks,
  spans,
  positionMs,
  durationMs,
  playing,
  onSeek,
  className,
}: {
  peaks: readonly number[] | null;
  /** Tramos por hablante en ms de la grabación. */
  spans: readonly { start: number; end: number; role: WaveformSpan["role"] }[];
  positionMs: number;
  durationMs: number;
  playing: boolean;
  onSeek: (ms: number) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion() === true;
  const driftRef = useRef(0);

  const total = Math.max(1, durationMs);
  const frameRef = useRef<Frame>({ peaks: null, spans: [], progress: 0 });
  frameRef.current = {
    peaks,
    spans: spans.map((span) => ({ from: span.start / total, to: span.end / total, role: span.role })),
    progress: Math.min(1, Math.max(0, positionMs / total)),
  };

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const palette = readAuraPalette(canvas);
    if (palette === null) return;
    drawWaveform(canvas, {
      ...frameRef.current,
      drift: driftRef.current,
      colors: { agent: palette.agent, caller: palette.caller, neutral: palette.idle },
    });
  }, []);

  // Cada render repinta (posición, picos, tramos) y el tamaño también.
  useEffect(paint);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const resize = new ResizeObserver(paint);
    resize.observe(canvas);
    return () => resize.disconnect();
  }, [paint]);

  // Deriva suave solo mientras suena y con movimiento permitido.
  useEffect(() => {
    if (!playing || reduced) return;
    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      driftRef.current += last === 0 ? 0.016 : Math.min((now - last) / 1000, 0.05);
      last = now;
      paint();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced, paint]);

  return (
    <div
      className={cn(
        "relative h-[170px] w-full rounded-2xl has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-foreground/50",
        className,
      )}
    >
      <canvas ref={canvasRef} aria-hidden className="block size-full" />
      <input
        type="range"
        min={0}
        max={total}
        step={100}
        value={Math.min(total, Math.round(positionMs))}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="Posición de la grabación"
        aria-valuetext={`${formatDuration(positionMs / 1000)} de ${formatDuration(total / 1000)}`}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </div>
  );
}
