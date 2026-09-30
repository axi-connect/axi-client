/** El contrato entre el hilo (`thread.ts`) y sus dos renderers (WebGL y 2D). */
import type { Sample } from "@/modules/landing/domain/film/thread-geometry";

export type ThreadFrame = {
  /** Columna del haz: puntos × (x, y, marca, distancia a la cabeza), de la cola a la cabeza. */
  spine: Float32Array;
  spineLength: number;
  /** El tramo iluminado tal cual (el renderer 2D lo dibuja como un hilo). */
  samples: readonly Sample[];
  sampleCount: number;
  scroll: number;
  /** Hay cabeza en camino; `false` cuando la luz ya llegó al final. */
  head: boolean;
  pointer: { x: number; y: number; strength: number };
};

export type ThreadRenderer = {
  readonly kind: "gl" | "2d";
  resize(width: number, height: number, dpr: number): void;
  draw(frame: ThreadFrame): void;
  clear(): void;
  /** Baja un nivel de calidad. `false` si ya está en el mínimo. */
  degrade(): boolean;
  destroy(): void;
};
