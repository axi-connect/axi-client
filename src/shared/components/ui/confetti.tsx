"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from "react";
import type { CreateTypes, Options } from "canvas-confetti";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/core/lib/utils";

/**
 * Confeti de celebración sobre un `<canvas>` propio, a pantalla completa y sin
 * capturar el puntero. Adaptado de un componente de plantilla (magicui
 * «Confetti») con los cambios que lo hacen de este repo:
 *
 * 1. **Carga diferida**: `canvas-confetti` se importa en el primer `fire`, no
 *    al montar; la ruta que lo usa no paga la librería hasta que celebra.
 * 2. **`prefers-reduced-motion` lo apaga**: `fire` es un no-op y el canvas no
 *    se crea. Una lluvia de partículas es justo lo que esa preferencia pide
 *    evitar.
 * 3. **Solo ráfagas finitas**: `fire` recibe una lista de disparos con su
 *    instante (`at`, en ms). Todo termina solo y los temporizadores se cancelan
 *    al desmontar. No es un loop (DESIGN-SYSTEM §6): lo dispara una acción del
 *    usuario y acaba.
 * 4. **Sin `ConfettiButton`** ni autodisparo al montar: el único consumidor
 *    decide cuándo (la bienvenida espera a que el splash se haya ido).
 *
 * Los colores no se fijan aquí: el preset `brandCelebration` los recibe ya
 * leídos de los tokens (`readBrandPaletteCss`).
 */

export type ConfettiShot = Options & {
  /** Milisegundos desde `fire` hasta este disparo (0 por defecto). */
  at?: number;
};

export type ConfettiApi = {
  fire: (shots: readonly ConfettiShot[]) => void;
};

export function Confetti({ ref, className }: { ref?: Ref<ConfettiApi>; className?: string }) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<CreateTypes | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      instanceRef.current?.reset();
      instanceRef.current = null;
    };
  }, []);

  const fire = useCallback(
    (shots: readonly ConfettiShot[]) => {
      if (reduced || shots.length === 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      void import("canvas-confetti").then(({ default: confetti }) => {
        if (!mountedRef.current) return;
        // `useWorker`: con OffscreenCanvas las partículas se animan fuera del
        // hilo principal; sin él la librería cae sola al hilo principal.
        instanceRef.current ??= confetti.create(canvas, { resize: true, useWorker: true });
        const instance = instanceRef.current;
        for (const { at = 0, ...options } of shots) {
          timersRef.current.push(setTimeout(() => void instance(options), at));
        }
      });
    },
    [reduced],
  );

  useImperativeHandle(ref, () => ({ fire }), [fire]);

  if (reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="confetti-canvas"
      className={cn("pointer-events-none fixed inset-0 z-[60] size-full", className)}
    />
  );
}

/** Duración de los cañones laterales; con los `ticks` por defecto todo ha caído antes de los 4 s. */
const CANNON_MS = 2200;
const CANNON_EVERY_MS = 120;

/**
 * La celebración de marca: dos cañones laterales durante ~2,2 s y un estallido
 * central cuando ya hay partículas en el aire. Pura y determinista: devuelve
 * los disparos, no los ejecuta. `colors` son los tres tonos de marca del tema.
 */
export function brandCelebration(colors: readonly string[]): ConfettiShot[] {
  const shared: Options = { colors: [...colors], ticks: 220, gravity: 1, drift: 0 };
  const shots: ConfettiShot[] = [];
  for (let at = 0; at < CANNON_MS; at += CANNON_EVERY_MS) {
    shots.push(
      { ...shared, at, particleCount: 4, angle: 60, spread: 55, startVelocity: 58, origin: { x: 0, y: 0.62 } },
      { ...shared, at, particleCount: 4, angle: 120, spread: 55, startVelocity: 58, origin: { x: 1, y: 0.62 } },
    );
  }
  shots.push({ ...shared, at: 900, particleCount: 90, spread: 75, startVelocity: 42, scalar: 1.05, origin: { x: 0.5, y: 0.35 } });
  return shots;
}
