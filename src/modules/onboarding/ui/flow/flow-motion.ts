import { fade, spring } from "@/core/styles/motion";

/**
 * Coreografía común de las pantallas «Flow» (registro y onboarding): cada
 * pantalla entra subiendo con un spring suave y sale hacia arriba con un fade
 * corto. Los objetos son constantes de módulo a propósito: el orquestador los
 * compara por identidad en `onAnimationComplete` para saber si terminó la
 * ENTRADA (y entonces enfocar el primer control) o la salida.
 */
export const FLOW_INITIAL = { opacity: 0, y: 22 } as const;
export const FLOW_ENTER = { opacity: 1, y: 0, transition: spring.soft } as const;
export const FLOW_EXIT = { opacity: 0, y: -18, transition: fade.fast } as const;

/** Solo con puntero fino: en móvil el foco automático levanta el teclado sin que nadie lo pida. */
export function hasFinePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}
