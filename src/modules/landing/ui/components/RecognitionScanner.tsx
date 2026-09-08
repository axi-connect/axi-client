"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Instagram, MessageCircle, ScanSearch } from "lucide-react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/core/lib/utils";
import { RECOGNITION } from "@/modules/landing/ui/content/landing.content";

/**
 * Línea de tiempo del bucle (segundos). El único reloj es `performance.now()`;
 * los números viven aquí para que el componente no invente ninguno.
 */
const TIMELINE = {
  /** Duración total del bucle. */
  total: 9,
  /** Entra la captura. */
  in: 0,
  /** Arranca la línea de luz. */
  scan: 1.1,
  /** Cuánto tarda la línea en recorrer la foto. */
  scanDuration: 1.5,
  /** Vuelo de cada punto hasta la ficha. */
  flight: 1.35,
  /** Se enciende la coincidencia. */
  match: 3.9,
  /** Cae la respuesta. */
  reply: 5.2,
} as const;

/** Puntos de la nube. Muestreo de 40×30 sobre la foto: los puntos SON la imagen. */
const PARTICLES = 340;
const SAMPLE_W = 40;
const SAMPLE_H = 30;

type Phase = "idle" | "in" | "scan" | "flow" | "match" | "reply";

type Sample = { u: number; v: number; r: number; g: number; b: number };
type Particle = Sample & { size: number; jitter: number; lag: number; violet: boolean };

/**
 * PRNG con semilla (LCG). Jamás `Math.random()`: la nube tiene que ser la
 * misma en cada visita y, sobre todo, igual en servidor y cliente.
 */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function phaseAt(t: number): Phase {
  if (t < TIMELINE.scan) return "in";
  if (t < TIMELINE.scan + TIMELINE.scanDuration) return "scan";
  if (t < TIMELINE.match) return "flow";
  if (t < TIMELINE.reply) return "match";
  return "reply";
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeInOut = (p: number): number => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

/**
 * «El escáner» (plan F8 §4.1): la captura del cliente se recorre con una
 * línea de luz, se deshace en una nube de puntos con los colores REALES de la
 * foto, los puntos vuelan hasta la ficha correcta del catálogo, la ficha se
 * enciende con la similitud y la respuesta cae en la burbuja de WhatsApp.
 *
 * Reglas (DESIGN-SYSTEM §6): Canvas 2D solo para los puntos; el resto es DOM
 * con `transform`/`opacity`. Se pausa fuera de viewport (IntersectionObserver,
 * como `BrandGradientCanvas`). Con `prefers-reduced-motion` no hay canvas y se
 * pinta el ESTADO FINAL. Colores desde tokens resueltos en runtime, cero hex.
 * Violeta solo en los marcadores de IA: línea de luz, anillo, barra, chip.
 */
export function RecognitionScanner({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const scanlineRef = useRef<HTMLSpanElement | null>(null);
  const matchRef = useRef<HTMLLIElement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (reduced) return;
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    const scanline = scanlineRef.current;
    const match = matchRef.current;
    if (!root || !canvas || !frame || !scanline || !match) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* Colores de la foto: muestreados una vez, de una copia propia de la imagen
       (mismo origen, así `getImageData` no está prohibido). */
    let samples: Sample[] = [];
    let particles: Particle[] = [];
    const source = new window.Image();
    source.decoding = "async";
    source.src = RECOGNITION.capture.imageSrc;
    source.onload = () => {
      try {
        const off = document.createElement("canvas");
        off.width = SAMPLE_W;
        off.height = SAMPLE_H;
        const c = off.getContext("2d");
        if (!c) return;
        c.drawImage(source, 0, 0, SAMPLE_W, SAMPLE_H);
        const data = c.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
        const next: Sample[] = [];
        for (let y = 0; y < SAMPLE_H; y++) {
          for (let x = 0; x < SAMPLE_W; x++) {
            const i = (y * SAMPLE_W + x) * 4;
            next.push({
              u: (x + 0.5) / SAMPLE_W,
              v: (y + 0.5) / SAMPLE_H,
              r: data[i] ?? 0,
              g: data[i + 1] ?? 0,
              b: data[i + 2] ?? 0,
            });
          }
        }
        samples = next;
        particles = [];
      } catch {
        samples = [];
      }
    };

    const violet = () => getComputedStyle(root).getPropertyValue("--axi-violet").trim() || "currentColor";

    const build = () => {
      const rnd = lcg(20260908);
      const built: Particle[] = [];
      for (let k = 0; k < PARTICLES; k++) {
        const fallback: Sample = { u: rnd(), v: rnd(), r: 0, g: 0, b: 0 };
        const s = samples.length > 0 ? (samples[Math.floor(rnd() * samples.length)] ?? fallback) : fallback;
        built.push({
          ...s,
          size: 1.2 + rnd() * 1.9,
          jitter: (rnd() - 0.5) * 90,
          lag: rnd() * 0.25,
          violet: rnd() < 0.22,
        });
      }
      particles = built;
    };

    let rect = root.getBoundingClientRect();
    let cap = { x: 0, y: 0, w: 1, h: 1 };
    let target = { x: 0, y: 0 };
    let dpr = 1;
    const measure = () => {
      rect = root.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const f = frame.getBoundingClientRect();
      const m = match.getBoundingClientRect();
      cap = { x: f.left - rect.left, y: f.top - rect.top, w: f.width, h: f.height };
      target = { x: m.left - rect.left + m.width / 2, y: m.top - rect.top + m.height / 2 };
    };
    const resize = new ResizeObserver(measure);
    resize.observe(root);

    let current: Phase = "idle";
    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      const scanP = clamp01((t - TIMELINE.scan) / TIMELINE.scanDuration);
      scanline.style.transform = `translateY(${String(scanP * cap.h)}px)`;
      frame.style.setProperty("--scan", `${String(scanP * 100)}%`);
      if (t < TIMELINE.scan || t > TIMELINE.reply + 0.6 || particles.length === 0) return;

      const violetColor = violet();
      for (const p of particles) {
        /* Cada punto nace cuando la línea de luz pasa por su fila. */
        const birth = TIMELINE.scan + p.v * TIMELINE.scanDuration + p.lag;
        const age = t - birth;
        if (age < 0) continue;
        const f = clamp01(age / TIMELINE.flight);
        const e = easeInOut(f);
        const sx = cap.x + p.u * cap.w;
        const sy = cap.y + p.v * cap.h;
        const cx = (sx + target.x) / 2;
        const cy = Math.min(sy, target.y) - 60 + p.jitter;
        const x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * cx + e * e * target.x;
        const y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * cy + e * e * target.y;
        const alpha = f < 0.1 ? f / 0.1 : f > 0.85 ? (1 - f) / 0.15 : 1;
        ctx.globalAlpha = alpha * 0.95;
        ctx.fillStyle = p.violet ? violetColor : `rgb(${String(p.r)} ${String(p.g)} ${String(p.b)})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    let start: number | null = null;
    let raf: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = ((now - start) / 1000) % TIMELINE.total;
      if (particles.length === 0 && (samples.length > 0 || now - start > 800)) build();
      const next = phaseAt(t);
      if (next !== current) {
        current = next;
        setPhase(next);
      }
      draw(t);
      raf = requestAnimationFrame(tick);
    };
    const play = () => {
      if (raf !== null) return;
      measure();
      start = null;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => (entry.isIntersecting ? play() : stop())),
      { threshold: 0.15 },
    );
    io.observe(root);

    return () => {
      stop();
      io.disconnect();
      resize.disconnect();
      source.onload = null;
    };
  }, [reduced]);

  /* Con reduced-motion, el estado final; si no, lo que dicte el reloj. */
  const isStatic = reduced === true;
  const shown = isStatic || phase !== "idle";
  const scanning = !isStatic && phase === "scan";
  const veiled = !isStatic && (phase === "scan" || phase === "flow");
  const dimmed = !isStatic && (phase === "flow" || phase === "match" || phase === "reply");
  const matched = isStatic || phase === "match" || phase === "reply";
  const replied = isStatic || phase === "reply";
  const { capture, catalog, reply, labels } = RECOGNITION;

  return (
    <div
      ref={rootRef}
      aria-label={RECOGNITION.ariaLabel}
      role="img"
      className={cn(
        "relative grid items-center gap-7 px-3 py-7 md:grid-cols-[minmax(220px,300px)_minmax(0,1fr)_minmax(240px,340px)] md:min-h-[420px]",
        className,
      )}
    >
      {isStatic ? null : (
        <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
      )}

      {/* La captura que comparte el cliente. */}
      <div className="relative z-[1] flex flex-col gap-2.5 max-md:mx-auto max-md:w-[min(100%,320px)]">
        <ColumnLabel icon={Instagram}>{labels.capture}</ColumnLabel>
        <div
          className={cn(
            "border-border bg-card shadow-float overflow-hidden rounded-xl border transition-[transform,opacity] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]",
            shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-3.5 scale-[.96] opacity-0",
          )}
        >
          <div className="text-muted-foreground border-border/60 flex items-center gap-1.5 border-b px-2.5 py-1.5 text-[10.5px]">
            <Instagram aria-hidden className="size-3" />
            <span className="text-foreground truncate font-medium">{capture.sourceLabel}</span>
          </div>
          <div ref={frameRef} className="relative overflow-hidden" style={{ ["--scan" as string]: "0%" }}>
            <Image
              src={capture.imageSrc}
              alt={capture.imageAlt}
              width={640}
              height={480}
              sizes="(max-width: 768px) 320px, 300px"
              className="aspect-[4/3] w-full object-cover"
            />
            {/* Lo ya escaneado se vela: la foto se «vacía» hacia los puntos. */}
            <span
              aria-hidden
              className={cn("pointer-events-none absolute inset-0 transition-opacity duration-300", veiled ? "opacity-100" : "opacity-0")}
              style={{
                background:
                  "linear-gradient(to bottom, color-mix(in srgb, var(--background) 55%, transparent) 0, color-mix(in srgb, var(--background) 55%, transparent) var(--scan), transparent var(--scan))",
              }}
            />
            <span
              ref={scanlineRef}
              aria-hidden
              className={cn("absolute inset-x-0 top-0 h-0.5 transition-opacity duration-200", scanning ? "opacity-100" : "opacity-0")}
              style={{
                background: "var(--axi-violet)",
                boxShadow:
                  "0 0 18px 4px color-mix(in srgb, var(--axi-violet) 70%, transparent), 0 0 2px var(--axi-violet)",
              }}
            >
              <span
                className="absolute inset-x-0 top-0.5 h-10"
                style={{
                  background:
                    "linear-gradient(to bottom, color-mix(in srgb, var(--axi-violet) 28%, transparent), transparent)",
                }}
              />
            </span>
          </div>
          <p className="px-2.5 py-1.5 text-[12.5px]">
            {capture.caption}
            <time className="text-muted-foreground mt-1 block text-right text-[10px]">{capture.time}</time>
          </p>
        </div>
      </div>

      {/* El catálogo: nueve fichas, una se enciende. */}
      <div className="relative z-[1] flex flex-col items-center gap-3">
        <ColumnLabel icon={ScanSearch}>{labels.catalog}</ColumnLabel>
        <ul className="grid grid-cols-3 gap-2" aria-hidden>
          {catalog.map((tile) => (
            <li
              key={tile.id}
              ref={tile.match ? matchRef : undefined}
              className={cn(
                "size-[62px] overflow-hidden rounded-[14px] border transition-[opacity,transform,box-shadow,border-color] duration-500",
                dimmed && !tile.match ? "opacity-[.28]" : "opacity-100",
                isStatic && !tile.match ? "opacity-50" : "",
                tile.match && matched ? "scale-[1.12] border-accent-violet" : "border-transparent",
              )}
              style={{
                /* Fondo claro FIJO para todas las fichas: las fotos de stock traen
                   blancos distintos y en `multiply` se funden en uno. Del token
                   `--foreground` de la isla (claro), nunca un hex. */
                background: "color-mix(in srgb, var(--foreground) 92%, var(--background))",
                boxShadow:
                  tile.match && matched
                    ? "0 0 0 3px color-mix(in srgb, var(--axi-violet) 35%, transparent), 0 12px 30px -10px color-mix(in srgb, var(--axi-violet) 70%, transparent)"
                    : undefined,
              }}
            >
              <Image
                src={tile.imageSrc}
                alt=""
                width={62}
                height={62}
                sizes="62px"
                className="size-full object-cover mix-blend-multiply"
              />
            </li>
          ))}
        </ul>
        <div
          className={cn(
            "text-muted-foreground flex w-[206px] items-center gap-2 text-[11px] transition-[opacity,transform] duration-400",
            matched ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
          )}
        >
          <span>{labels.similarity}</span>
          <span className="bg-muted h-1 flex-1 overflow-hidden rounded-full" aria-hidden>
            <span
              className="bg-accent-violet block h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{ width: matched ? `${String(Math.round(RECOGNITION.score * 100))}%` : "0%" }}
            />
          </span>
          <span className="tabular-nums">
            {RECOGNITION.score.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <Chip visible={matched} className="md:hidden" />
      </div>

      {/* La respuesta del agente, como la ve el cliente. */}
      <div className="relative z-[1] flex flex-col gap-2.5 max-md:mx-auto max-md:w-[min(100%,320px)] md:items-end">
        <ColumnLabel icon={MessageCircle}>{labels.reply}</ColumnLabel>
        <div
          className={cn(
            "bg-brand/12 border-brand/25 shadow-float w-full rounded-2xl rounded-br-md border px-3 py-2 text-[13px] leading-snug transition-[opacity,transform] duration-600 ease-[cubic-bezier(.2,.8,.2,1)]",
            replied ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-[.97] opacity-0",
          )}
        >
          {reply.text}
          <span className="border-border bg-card mt-2 block overflow-hidden rounded-xl border">
            <Image
              src={reply.product.imageSrc}
              alt={reply.product.imageAlt}
              width={640}
              height={400}
              sizes="(max-width: 768px) 320px, 340px"
              className="aspect-[16/10] w-full object-cover"
            />
            <span className="block px-2.5 py-2">
              <span className="block text-[13px] font-semibold">{reply.product.name}</span>
              <span className="text-muted-foreground mt-0.5 block font-mono text-[11px]">{reply.product.meta}</span>
            </span>
          </span>
          <time className="text-muted-foreground mt-1 block text-right text-[10px]">{reply.time} ✓✓</time>
        </div>
      </div>

      <Chip visible={matched} className="absolute top-4 left-1/2 z-[2] -translate-x-1/2 max-md:hidden" />
    </div>
  );
}

function ColumnLabel({ icon: Icon, children }: { icon: typeof Instagram; children: string }) {
  return (
    <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium tracking-[.12em] uppercase">
      <Icon aria-hidden className="size-3.5" />
      {children}
    </span>
  );
}

/** Marcador de IA: el único violeta con texto de la vista. */
function Chip({ visible, className }: { visible: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "text-accent-violet inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap transition-[opacity,transform] duration-400",
        visible ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0",
        className,
      )}
      style={{
        borderColor: "color-mix(in srgb, var(--axi-violet) 40%, transparent)",
        background: "color-mix(in srgb, var(--axi-violet) 10%, var(--background))",
      }}
    >
      <ScanSearch aria-hidden className="size-3.5" />
      {RECOGNITION.chip}
    </span>
  );
}
