/**
 * Respaldo del hilo cuando no hay WebGL: un solo trazo en tinta con la cabeza
 * luminosa. Mismo recorrido y mismos tiempos; menos materia.
 */
import type { ThreadRenderer } from "./thread-renderer";

export function create2dRenderer(canvas: HTMLCanvasElement): ThreadRenderer | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  return {
    kind: "2d",
    resize(w, h, ratio) {
      width = w;
      height = h;
      dpr = ratio;
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
    },
    clear() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
    },
    draw({ samples, sampleCount, head }) {
      this.clear();
      if (sampleCount < 2) return;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i < sampleCount; i++) {
        const s = samples[i];
        if (i) ctx.lineTo(s.x, s.y);
        else ctx.moveTo(s.x, s.y);
      }
      ctx.strokeStyle = "rgba(245,245,247,.06)";
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.strokeStyle = "rgba(245,245,247,.4)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      if (!head) return;
      const h = samples[sampleCount - 1];
      const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 34);
      g.addColorStop(0, "rgba(255,255,255,.95)");
      g.addColorStop(0.12, "rgba(255,240,236,.55)");
      g.addColorStop(1, "rgba(255,240,236,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 34, 0, Math.PI * 2);
      ctx.fill();
    },
    degrade: () => false,
    destroy() {
      this.clear();
    },
  };
}
