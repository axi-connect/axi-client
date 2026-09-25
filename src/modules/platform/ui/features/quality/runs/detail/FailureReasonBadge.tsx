/**
 * Píldora del `failure_reason` de un case: los fallos de INSTRUMENTO
 * (simulador/escenario), infraestructura y contexto (cancelada/suspendido/
 * IA pausada) se distinguen visualmente del fallo real del agente evaluado
 * (categorías de `parseFailureReason`). Tooltip = texto crudo completo. El
 * tono va en el punto y el texto en foreground (AA, quality_premium_plan F1).
 */
import { parseFailureReason } from "../../../../../domain/quality-runs";
import { TonePill } from "../../shared/premium";

export function FailureReasonBadge({ reason }: { reason: string | null | undefined }) {
  const info = parseFailureReason(reason);
  if (!info) return null;
  return (
    <TonePill tone={info.tone} title={info.detail}>
      {info.label}
    </TonePill>
  );
}
