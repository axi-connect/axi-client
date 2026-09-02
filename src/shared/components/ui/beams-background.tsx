"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/core/lib/utils";

/**
 * Haces de luz inclinados que suben despacio detrás de una sección de la capa
 * pública (hoy: la banda de Módulos de la landing). Adaptado de un componente
 * de plantilla («Beams Background»), con tres cambios que lo hacen de esta marca
 * y no de cualquier sitio:
 *
 * 1. **Los colores salen de los tokens** (`--axi-brand`, `--axi-amber`,
 *    `--axi-violet`), leídos del contenedor con `getComputedStyle` en cada
 *    cambio de tema. El original pintaba tonos teal/azul fijos sobre un negro
 *    literal — fuera de paleta y ciego al tema (DESIGN §3.5, regla 1).
 * 2. **Mide la sección, no la pantalla**: `ResizeObserver` sobre el padre, que
 *    debe ser `relative` + `isolate`. El original era `min-h-screen`.
 * 3. **Sin dependencias nuevas** (`motion/react` fuera): el pulso vive en el
 *    propio bucle de canvas.
 *
 * Es la excepción sancionada a «nada se anima en bucle» (DESIGN-SYSTEM §6):
 * superficie de marketing, no de trabajo. Se apaga fuera de pantalla
 * (`IntersectionObserver`) y con `prefers-reduced-motion` dibuja un solo
 * fotograma quieto. En claro compone en `multiply` para que los haces no se
 * laven sobre blanco; en oscuro en `lighter`, donde son luz de verdad.
 *
 * El padre pone el velo (`.beams-veil`) para fundir los bordes con la página y
 * proteger la legibilidad del texto que va encima.
 */

type Intensity = "subtle" | "medium" | "strong";

type Beam = {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
  color: Rgb;
};

type Rgb = readonly [number, number, number];

const INTENSITY: Record<Intensity, number> = { subtle: 0.7, medium: 0.85, strong: 1 };
const TOKENS = ["--axi-brand", "--axi-amber", "--axi-violet"] as const;
/** Coral por si el token no llegara (nunca debería: está en `:root`). */
const FALLBACK: Rgb = [230, 87, 89];
const MAX_DPR = 2;

function hexToRgb(hex: string): Rgb | null {
  const clean = hex.trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function readPalette(el: Element): Rgb[] {
  const styles = getComputedStyle(el);
  return TOKENS.map((token) => hexToRgb(styles.getPropertyValue(token)) ?? FALLBACK);
}

function isDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

function makeBeam(index: number, width: number, height: number, palette: Rgb[], fromBottom: boolean): Beam {
  const column = index % 3;
  const spacing = width / 3;
  const dark = isDark();
  return {
    x: column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.6,
    y: fromBottom ? height + 100 : Math.random() * height * 1.5 - height * 0.25,
    width: 70 + Math.random() * 90,
    length: height * 2.2,
    angle: -35 + Math.random() * 10,
    speed: 0.35 + Math.random() * 0.45,
    opacity: (dark ? 0.22 : 0.12) + Math.random() * (dark ? 0.16 : 0.08),
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.015 + Math.random() * 0.02,
    color: palette[index % palette.length],
  };
}

export function BeamsBackground({
  className,
  intensity = "strong",
}: {
  className?: string;
  intensity?: Intensity;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let beams: Beam[] = [];
    let palette = readPalette(host);
    let raf = 0;
    const scale = INTENSITY[intensity];

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const rect = host.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = width < 700 ? 10 : 18;
      beams = Array.from({ length: count }, (_, i) => makeBeam(i, width, height, palette, false));
    };

    const draw = (beam: Beam) => {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);
      const alpha = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * scale;
      const [r, g, b] = beam.color;
      const rgba = (a: number) => `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
      const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
      gradient.addColorStop(0, rgba(0));
      gradient.addColorStop(0.1, rgba(alpha * 0.5));
      gradient.addColorStop(0.4, rgba(alpha));
      gradient.addColorStop(0.6, rgba(alpha));
      gradient.addColorStop(0.9, rgba(alpha * 0.5));
      gradient.addColorStop(1, rgba(0));
      ctx.fillStyle = gradient;
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      ctx.restore();
    };

    const frame = (advance: boolean) => {
      ctx.clearRect(0, 0, width, height);
      ctx.filter = "blur(28px)";
      ctx.globalCompositeOperation = isDark() ? "lighter" : "multiply";
      beams.forEach((beam, i) => {
        if (advance) {
          beam.y -= beam.speed;
          beam.pulse += beam.pulseSpeed;
          if (beam.y + beam.length < -100) beams[i] = makeBeam(i, width, height, palette, true);
        }
        draw(beams[i]);
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.filter = "none";
    };

    const loop = () => {
      frame(true);
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const start = () => {
      stop();
      if (reduced) frame(false);
      else raf = requestAnimationFrame(loop);
    };

    size();
    start();

    const resize = new ResizeObserver(() => {
      size();
      frame(false);
    });
    resize.observe(host);

    // El tema cambia por clase en <html> (next-themes): se releen los tokens.
    const theme = new MutationObserver(() => {
      palette = readPalette(host);
      beams.forEach((beam, i) => {
        beam.color = palette[i % palette.length];
      });
      frame(false);
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const visibility = new IntersectionObserver((entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
    });
    visibility.observe(host);

    return () => {
      stop();
      resize.disconnect();
      theme.disconnect();
      visibility.disconnect();
    };
  }, [intensity, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 -z-20 h-full w-full blur-2xl", className)}
    />
  );
}
