import { peakAt } from "@/modules/calls/domain/waveform";
import type { Rgb } from "../aura/aura-renderer";

/**
 * Dibujo de la onda de la grabación (premium F2), portado del canvas aprobado:
 * cintas horizontales que siguen los picos reales, coloreadas por quién habla
 * en el tramo ya sonado y apagadas en lo que falta, con el cursor blanco.
 */

export type WaveformSpan = { from: number; to: number; role: "caller" | "agent" | "system" };

export type WaveformScene = {
  /** Picos 0..1; null = sin audio decodificado (línea casi plana). */
  peaks: readonly number[] | null;
  /** Tramos por hablante, en fracción 0..1 de la grabación. */
  spans: readonly WaveformSpan[];
  /** Posición 0..1 del cursor. */
  progress: number;
  /** Fase de la deriva (solo avanza mientras suena). */
  drift: number;
  colors: { agent: Rgb; caller: Rgb; neutral: Rgb };
};

const LINES = 34;
const WHITE: Rgb = [244, 244, 245];

function rgba(c: Rgb, alpha: number): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`;
}

function colorAt(scene: WaveformScene, x: number): string {
  if (x > scene.progress) return rgba(WHITE, 0.55);
  const span = scene.spans.find((s) => x >= s.from && x <= s.to);
  if (span === undefined || span.role === "system") return rgba(scene.colors.neutral, 0.85);
  return rgba(span.role === "agent" ? scene.colors.agent : scene.colors.caller, 1);
}

export function drawWaveform(canvas: HTMLCanvasElement, scene: WaveformScene): void {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelW = Math.round(width * dpr);
  const pixelH = Math.round(height * dpr);
  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW;
    canvas.height = pixelH;
  }
  const ctx = canvas.getContext("2d");
  if (ctx === null) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const middle = height / 2;
  const amplitude = height * 0.42;
  const cursor = scene.progress * width;

  // Gradiente horizontal con cortes duros en cada borde de tramo y en el cursor.
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  const cuts = [0, 1, scene.progress, ...scene.spans.flatMap((s) => [s.from, s.to])]
    .filter((v) => v >= 0 && v <= 1)
    .sort((a, b) => a - b);
  for (const cut of cuts) {
    gradient.addColorStop(Math.max(0, cut - 0.0005), colorAt(scene, Math.max(0, cut - 0.001)));
    gradient.addColorStop(Math.min(1, cut + 0.0005), colorAt(scene, Math.min(1, cut + 0.001)));
  }

  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = gradient;
  const samples = Math.max(120, Math.round(width / 3));
  for (let line = 0; line < LINES; line++) {
    const q = line / (LINES - 1);
    const centre = 1 - Math.abs(q - 0.5) * 2;
    ctx.globalAlpha = 0.1 + 0.5 * centre * centre;
    ctx.beginPath();
    for (let k = 0; k <= samples; k++) {
      const x = k / samples;
      const energy = scene.peaks === null ? 0.06 : Math.max(0.04, peakAt(scene.peaks, x));
      const y =
        middle +
        amplitude *
          energy *
          (0.62 * Math.sin(x * 38 + q * 2.2 + scene.drift * 0.8) +
            0.38 * Math.sin(x * 91 - q * 3.4 - scene.drift * 1.1)) *
          (0.55 + 0.45 * Math.sin(q * Math.PI));
      if (k === 0) ctx.moveTo(x * width, y);
      else ctx.lineTo(x * width, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // Velo sobre lo que falta por sonar y el cursor.
  ctx.fillStyle = rgba(WHITE, 0.035);
  ctx.fillRect(cursor, 0, width - cursor, height);
  ctx.fillStyle = rgba(WHITE, 0.95);
  ctx.fillRect(Math.round(cursor) - 1, 4, 2, height - 8);
}
