import type { AuraMode } from "@/modules/calls/domain/live-call";

/**
 * Dibujo del aura de la llamada (premium F2): cintas de líneas finas en
 * anillo, portado del canvas aprobado (`docs/design/mockups/calls-premium/
 * aura.js`). Sin DOM ni React: recibe un <canvas> y una paleta ya resuelta de
 * los tokens. Sin audio en el servidor, la energía sale del MODO.
 */

export type Rgb = readonly [number, number, number];

export type AuraPalette = {
  agent: Rgb;
  caller: Rgb;
  idle: Rgb;
};

type ModeTuning = { tone: keyof AuraPalette; amp: number; speed: number; spin: number; glow: number };

const MODES: Record<AuraMode, ModeTuning> = {
  agent: { tone: "agent", amp: 1, speed: 1, spin: 0.1, glow: 0.34 },
  caller: { tone: "caller", amp: 1, speed: 1, spin: -0.1, glow: 0.34 },
  thinking: { tone: "agent", amp: 0.34, speed: 2.2, spin: 0.55, glow: 0.18 },
  listening: { tone: "caller", amp: 0.3, speed: 0.6, spin: 0.04, glow: 0.14 },
  idle: { tone: "idle", amp: 0.16, speed: 0.35, spin: 0.02, glow: 0.06 },
};

const WHITE: Rgb = [244, 244, 245];

export type AuraOptions = {
  /** Cintas del anillo (64 en el escenario, ~26 en la mini). */
  lines: number;
  /** Puntos por cinta. */
  points: number;
  /** Radio base como fracción del lado menor. */
  scale: number;
  lineWidth: number;
  /** Centro vertical como fracción del alto. */
  centerY: number;
  /** Achata el anillo (1 = círculo). */
  squash: number;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgba(c: Rgb, alpha: number): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha.toFixed(3)})`;
}

/** Color «profundo» del tono: el extremo oscuro de las cintas exteriores. */
function deep(c: Rgb): Rgb {
  return mix(c, [20, 12, 40], 0.28);
}

export class AuraRenderer {
  private mode: AuraMode;
  private color: Rgb;
  private amp: number;
  private speed: number;
  private spin: number;
  private glow: number;
  private t: number;
  private rot = 0;
  private raf = 0;
  private last = 0;
  private running = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private palette: AuraPalette,
    private readonly options: AuraOptions,
    mode: AuraMode = "idle",
    seed = 0,
  ) {
    const tuning = MODES[mode];
    this.mode = mode;
    this.color = palette[tuning.tone];
    this.amp = tuning.amp;
    this.speed = tuning.speed;
    this.spin = tuning.spin;
    this.glow = tuning.glow;
    this.t = seed;
  }

  setMode(mode: AuraMode): void {
    this.mode = mode;
    if (!this.running) this.snapToMode();
  }

  setPalette(palette: AuraPalette): void {
    this.palette = palette;
    if (!this.running) this.snapToMode();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Un fotograma quieto (movimiento reducido o fuera de vista). */
  drawStill(): void {
    this.snapToMode();
    if (this.t === 0) this.t = 2.4;
    this.draw();
  }

  private snapToMode(): void {
    const tuning = MODES[this.mode];
    this.color = this.palette[tuning.tone];
    this.amp = tuning.amp;
    this.speed = tuning.speed;
    this.spin = tuning.spin;
    this.glow = tuning.glow;
    this.draw();
  }

  private readonly frame = (now: number): void => {
    if (!this.running) return;
    const dt = this.last === 0 ? 0.016 : Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    const tuning = MODES[this.mode];
    const k = 1 - Math.pow(0.02, dt); // ~1 s para llegar al modo nuevo
    this.color = mix(this.color, this.palette[tuning.tone], k);
    this.amp = lerp(this.amp, tuning.amp, k);
    this.speed = lerp(this.speed, tuning.speed, k);
    this.spin = lerp(this.spin, tuning.spin, k);
    this.glow = lerp(this.glow, tuning.glow, k);
    this.t += dt;
    this.rot += dt * this.spin;
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  /** La «voz» sintética: sílabas rápidas sobre frases lentas. */
  private envelope(): number {
    const syllable = Math.abs(Math.sin(this.t * 7.1) * Math.sin(this.t * 3.3 + 1.2));
    const phrase = 0.6 + 0.4 * Math.sin(this.t * 0.9);
    return 0.55 + 0.6 * syllable * phrase;
  }

  private draw(): void {
    const canvas = this.canvas;
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

    const { lines, points, scale, lineWidth, centerY, squash } = this.options;
    const cx = width / 2;
    const cy = height * centerY;
    const radius = Math.min(width, height) * scale;
    const speaking = this.mode === "agent" || this.mode === "caller";
    const energy = this.amp * (speaking ? this.envelope() : 1);

    const halo = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.9);
    halo.addColorStop(0, rgba(this.color, this.glow * 0.55));
    halo.addColorStop(0.55, rgba(this.color, this.glow * 0.18));
    halo.addColorStop(1, rgba(this.color, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = lineWidth;
    const outer = deep(this.color);
    const time = this.t * this.speed;
    for (let line = 0; line < lines; line++) {
      const p = lines === 1 ? 0.5 : line / (lines - 1);
      const middle = 1 - Math.abs(p - 0.5) * 2;
      const tone = mix(mix(outer, this.color, 0.35 + 0.65 * middle), WHITE, 0.18 * middle * middle);
      ctx.strokeStyle = rgba(tone, 0.05 + 0.42 * middle * middle);
      ctx.beginPath();
      for (let k = 0; k <= points; k++) {
        const theta = (k / points) * Math.PI * 2;
        const wobble =
          0.17 * Math.sin(3 * theta + time * 0.9 + p * 3.8) +
          0.11 * Math.sin(5 * theta - time * 1.3 + p * 5.6) +
          0.07 * Math.sin(2 * theta + time * 0.5 + p * 6.3) +
          0.04 * Math.sin(7 * theta + time * 2.1 - p * 3);
        const r = radius * (1 + energy * wobble + (p - 0.5) * 0.24 * (0.4 + energy));
        const angle = theta + this.rot + p * 0.35 * energy;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r * squash;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }
}

/** `#rrggbb`, `#rgb` o `rgb(r g b)` / `rgb(r, g, b)` → Rgb; null si no se entiende. */
export function parseCssColor(value: string): Rgb | null {
  const raw = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(raw);
  if (hex !== null) {
    const digits = hex[1] ?? "";
    const full = digits.length === 3 ? [...digits].map((d) => d + d).join("") : digits;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  }
  const rgb = /^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/.exec(raw);
  if (rgb !== null) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

/** Gris del silencio: el tono del agente sin saturación, a media luz. */
export function idleTone(agent: Rgb): Rgb {
  const luma = 0.299 * agent[0] + 0.587 * agent[1] + 0.114 * agent[2];
  const gray = lerp(luma, 150, 0.5);
  return [gray, gray, gray + 8];
}

/**
 * Paleta desde los TOKENS del subárbol del elemento (DESIGN §3.5: nada de hex
 * en componentes). Dentro de una superficie de tinta (`.surface-dark`) los
 * tokens ya son los del esquema oscuro. null si no se pueden leer.
 */
export function readAuraPalette(element: Element): AuraPalette | null {
  const style = getComputedStyle(element);
  const agent = parseCssColor(style.getPropertyValue("--axi-violet"));
  const caller = parseCssColor(style.getPropertyValue("--axi-brand"));
  if (agent === null || caller === null) return null;
  return { agent, caller, idle: idleTone(agent) };
}
