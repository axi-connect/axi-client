/**
 * Badge tonal del `failure_reason` de un case: los fallos de INSTRUMENTO
 * (simulador/escenario), infraestructura y contexto (cancelada/suspendido/
 * IA pausada) se distinguen visualmente del fallo real del agente evaluado
 * (categorías de `parseFailureReason`). Tooltip = texto crudo completo.
 */
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { parseFailureReason } from "../../../../../domain/quality-runs";

const TONE_CLASSES = {
  warning: "border-warning/40 bg-warning/10 text-warning",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted text-muted-foreground",
} as const;

export function FailureReasonBadge({ reason }: { reason: string | null | undefined }) {
  const info = parseFailureReason(reason);
  if (!info) return null;
  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[info.tone])} title={info.detail}>
      {info.label}
    </Badge>
  );
}
