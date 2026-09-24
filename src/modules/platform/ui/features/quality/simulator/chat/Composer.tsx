"use client";

/**
 * Compositor del operador: texto (Enter envía, Shift+Enter salto de línea).
 * Deshabilitado con motivo cuando la sesión no acepta mensajes. Los medios
 * (imagen, audio, ubicación) llegan en la F2 del plan.
 */
import { useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatUsd, MESSAGE_BODY_MAX } from "../../../../../domain/quality-sessions";

type ComposerProps = {
  disabled: boolean;
  disabledReason?: string | null;
  pending: boolean;
  capUsd: number;
  dailyCapUsd: number;
  onSend: (body: string) => void;
};

export function Composer({ disabled, disabledReason, pending, capUsd, dailyCapUsd, onSend }: ComposerProps) {
  const [draft, setDraft] = useState("");
  const trimmed = draft.trim();
  const canSend = !disabled && !pending && trimmed.length > 0;

  const send = () => {
    if (!canSend) return;
    onSend(trimmed);
    setDraft("");
  };

  return (
    <div className="space-y-2 border-t border-border/60 px-3 py-2.5">
      <div className="flex items-end gap-2">
        <Textarea
          id="session-composer"
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, MESSAGE_BODY_MAX))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          disabled={disabled}
          placeholder={disabled ? disabledReason ?? "La sesión no acepta mensajes" : "Escribe como el cliente… (Enter envía, Shift+Enter salto)"}
          rows={1}
          className="min-h-11 max-h-40 flex-1 resize-none"
          aria-label="Mensaje del cliente simulado"
        />
        <Button type="button" size="icon" onClick={send} disabled={!canSend} aria-label="Enviar">
          <SendHorizontal aria-hidden="true" />
        </Button>
      </div>
      <p className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          Entra por el pipeline real: batching, tools y botones como en WhatsApp. Cada turno se cobra a plataforma.
        </span>
        <span className="tabular-nums">
          tope {formatUsd(capUsd)} · diario {formatUsd(dailyCapUsd)}
        </span>
      </p>
    </div>
  );
}
