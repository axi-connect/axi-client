/**
 * Tipos del semáforo de estado, en un módulo SIN React a propósito: los mapas
 * estado→tono viven en el `domain/` de cada slice, que es TypeScript puro
 * (arquitectura §3.3.1) y no puede depender de un componente.
 */

export type StatusTone = "success" | "warning" | "destructive" | "info" | "neutral";

export type StatusEntry = {
  label: string;
  tone: StatusTone;
  /** Estado en curso: añade un spinner. Úsalo solo si algo se está moviendo. */
  transient?: boolean;
};

export type StatusMap = Record<string, StatusEntry>;
