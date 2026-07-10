import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases condicionales (clsx) y resuelve conflictos de utilidades
 * Tailwind (tailwind-merge): la última clase en conflicto gana.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
