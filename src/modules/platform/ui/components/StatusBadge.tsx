/**
 * Compatibilidad: el estado del panel es UNO, `PlatformStatePill` (rediseño
 * F1). Este nombre se conserva para no tocar las vistas de F2–F5 antes de su
 * fase; ya pinta la píldora nueva (punto de color, texto en foreground).
 * `appearance` se acepta y se ignora: la píldora siempre es la que pasa AA.
 */
import type { StateSubject } from "../../domain/platform-states";
import { PlatformStatePill } from "./PlatformStatePill";

type StatusBadgeProps = {
  status: string;
  className?: string;
  subject?: StateSubject;
  /** @deprecated La píldora es siempre la de punto. */
  appearance?: "tint" | "dot";
};

export function StatusBadge({ status, className, subject }: StatusBadgeProps) {
  return <PlatformStatePill status={status} subject={subject} className={className} />;
}
