"use client";

import { useId } from "react";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
  CALL_TYPE_HINTS,
  CALL_TYPE_LABELS,
  PROACTIVE_CALL_TYPES,
  type ProactiveCallType,
} from "@/modules/calls/domain/playbooks";

/**
 * «Tipo de llamada» (plan de modos §7): el marco con que el agente lleva una
 * llamada que se programa desde el CRM — una tarea, un seguimiento en lote o
 * un paso de secuencia. Solo se muestra cuando el canal LLAMA; quien la usa
 * decide cuándo. Sin elegir, `followup` (el de una tarea del CRM de siempre).
 */
export function CallTypeSelect({
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  value: ProactiveCallType;
  onChange: (next: ProactiveCallType) => void;
  disabled?: boolean;
  /** Sin la línea de ayuda: para una fila de paso de secuencia. */
  compact?: boolean;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Tipo de llamada</Label>
      <Select value={value} onValueChange={(next: string) => onChange(next as ProactiveCallType)} disabled={disabled}>
        <SelectTrigger id={id} className="h-9 w-full" aria-describedby={compact ? undefined : `${id}-hint`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROACTIVE_CALL_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {CALL_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!compact && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {CALL_TYPE_HINTS[value]} El agente sigue el marco de este tipo (Llamadas → Marcos).
        </p>
      )}
    </div>
  );
}
