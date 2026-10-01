/**
 * El guion de lectura de la meta (dueña, 2026-10-01: «el mismo tratamiento
 * que el piloto»). Las mesetas son los momentos de `goalFrame`, cada uno ya
 * entero (sin fundidos a medias):
 * - 0,2: «Estás aquí», con el coche saliendo;
 * - 0,58: el coche se detiene y la comparación («vas lento» frente a lo esperado);
 * - 0,7: la proyección a este ritmo;
 * - 0,8: la ruta que propone Axi (recalculada);
 * - 0,9: aprobada, con la nueva llegada;
 * - 1: la llegada, antes de soltar la escena.
 */
import { storyAt, storyPlateaus, type StoryKnot } from "./story";

const GOAL_KNOTS: readonly StoryKnot[] = [
  [0, 0, 0],
  [0.2, 1.4, 1.0],
  [0.58, 1.4, 1.0],
  [0.7, 0.7, 0.9],
  [0.8, 0.7, 1.0],
  [0.9, 0.6, 1.0],
  [1, 0.6, 0.9],
];

export const GOAL_PLATEAUS = storyPlateaus(GOAL_KNOTS);

export const goalStory = (p: number): number => storyAt(p, GOAL_PLATEAUS);
