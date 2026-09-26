"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/core/lib/utils";
import type { AuraMode } from "@/modules/calls/domain/live-call";
import { AuraRenderer, readAuraPalette, type AuraOptions } from "./aura-renderer";

const PRESETS: Record<"stage" | "mini", AuraOptions> = {
  stage: { lines: 64, points: 160, scale: 0.4, lineWidth: 0.9, centerY: 0.5, squash: 1 },
  mini: { lines: 26, points: 90, scale: 0.3, lineWidth: 0.8, centerY: 0.5, squash: 1 },
};

/**
 * El aura de una llamada en vivo (premium F2): violeta cuando habla el agente,
 * coral cuando habla el cliente, gris en silencio; más rápida y tenue cuando
 * el agente piensa. Decorativa (`aria-hidden`): quién habla se dice en texto
 * al lado. Se detiene fuera de vista o con la pestaña oculta, y con
 * `prefers-reduced-motion` queda en un fotograma quieto que solo cambia de color.
 */
export function CallAura({
  mode,
  size = "stage",
  options,
  seed = 0,
  className,
}: {
  mode: AuraMode;
  size?: "stage" | "mini";
  /** Ajustes sobre el preset (centro, achatado…). */
  options?: Partial<AuraOptions>;
  seed?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<AuraRenderer | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const reduced = useReducedMotion() === true;
  const optionsKey = JSON.stringify(options ?? {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const palette = readAuraPalette(canvas);
    if (palette === null) return;
    const renderer = new AuraRenderer(
      canvas,
      palette,
      { ...PRESETS[size], ...(JSON.parse(optionsKey) as Partial<AuraOptions>) },
      modeRef.current,
      seed,
    );
    rendererRef.current = renderer;

    let visible = true;
    const sync = () => {
      const animate = !reduced && visible && document.visibilityState === "visible";
      if (animate) renderer.start();
      else {
        renderer.stop();
        renderer.drawStill();
      }
    };

    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      sync();
    });
    intersection.observe(canvas);
    const resize = new ResizeObserver(() => {
      if (reduced || !visible) renderer.drawStill();
    });
    resize.observe(canvas);
    // Cambio de tema (clase `dark` en <html>): los tokens cambian de valor.
    const theme = new MutationObserver(() => {
      const next = readAuraPalette(canvas);
      if (next !== null) renderer.setPalette(next);
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      renderer.stop();
      intersection.disconnect();
      resize.disconnect();
      theme.disconnect();
      document.removeEventListener("visibilitychange", sync);
      rendererRef.current = null;
    };
  }, [size, optionsKey, seed, reduced]);

  useEffect(() => {
    rendererRef.current?.setMode(mode);
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none block size-full", className)}
    />
  );
}
