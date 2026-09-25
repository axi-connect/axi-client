"use client";

/**
 * Compositor del operador: texto (Enter envía, Shift+Enter salto de línea),
 * imagen (F2, JPEG/PNG/WebP ≤ 5 MB), nota de voz grabada en el navegador
 * (F2, el server la transcodifica a ogg/opus como WhatsApp) y ubicación (F2,
 * diálogo con presets). Deshabilitado con motivo cuando la sesión no acepta
 * mensajes. Los errores de subida se muestran junto al compositor, no en un
 * toast que se pierde.
 */
import { useRef, useState } from "react";
import { Image as ImageIcon, MapPin, Mic, SendHorizontal, Square, Trash2 } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { useVoiceRecorder } from "@/modules/inbox/infrastructure/hooks/use-voice-recorder";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatUsd, IMAGE_ACCEPT, MEDIA_MAX_BYTES, MESSAGE_BODY_MAX } from "../../../../../domain/quality-sessions";
import { LocationDialog, type SessionLocation } from "./LocationDialog";

type ComposerProps = {
  disabled: boolean;
  disabledReason?: string | null;
  pending: boolean;
  capUsd: number;
  dailyCapUsd: number;
  onSend: (body: string) => void;
  onSendMedia: (input: { file: Blob; filename: string; caption?: string; voiceNote?: boolean }) => void;
  onSendLocation: (location: SessionLocation) => void;
};

function formatSeconds(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function Composer({ disabled, disabledReason, pending, capUsd, dailyCapUsd, onSend, onSendMedia, onSendLocation }: ComposerProps) {
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recorder = useVoiceRecorder();
  const trimmed = draft.trim();
  const canSend = !disabled && !pending && trimmed.length > 0;
  const recording = recorder.status === "recording";
  const previewing = recorder.status === "preview" && recorder.recording !== null;

  const send = () => {
    if (!canSend) return;
    onSend(trimmed);
    setDraft("");
  };

  const pickImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MEDIA_MAX_BYTES) {
      setLocalError(`La imagen supera el máximo de ${String(MEDIA_MAX_BYTES / (1024 * 1024))} MB.`);
      return;
    }
    setLocalError(null);
    // El texto escrito viaja como caption de la foto (como en WhatsApp)
    onSendMedia({ file, filename: file.name, ...(trimmed ? { caption: trimmed } : {}) });
    setDraft("");
  };

  const sendVoice = () => {
    if (!recorder.recording) return;
    const extension = recorder.recording.mime_type.includes("mp4") ? "m4a" : recorder.recording.mime_type.includes("ogg") ? "ogg" : "webm";
    onSendMedia({ file: recorder.recording.blob, filename: `nota-de-voz.${extension}`, voiceNote: true });
    recorder.reset();
  };

  return (
    <div className="space-y-2 border-t border-border px-4 pt-3 pb-3.5">
      {previewing ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-secondary px-3 py-2">
          <Mic aria-hidden="true" className="size-4 text-brand" />
          <span className="text-sm">Nota de voz · {formatSeconds(recorder.recording?.duration_ms ?? 0)}</span>
          <audio controls preload="metadata" src={recorder.recording?.object_url} className="h-8 max-w-[14rem] flex-1">
            <track kind="captions" />
          </audio>
          <Button type="button" variant="ghost" size="sm" onClick={() => recorder.reset()} aria-label="Descartar nota de voz">
            <Trash2 aria-hidden="true" />
          </Button>
          <Button type="button" size="sm" onClick={sendVoice} disabled={disabled || pending}>
            <SendHorizontal aria-hidden="true" />
            Enviar nota
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5 rounded-2xl border border-input bg-card p-1.5 transition-[box-shadow,border-color] has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-[3px] has-[textarea:focus-visible]:ring-ring/50">
          <div className="flex h-10 items-center gap-0.5 text-muted-foreground">
            <input ref={fileInputRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={pickImage} aria-label="Elegir imagen" />
            <Button type="button" variant="ghost" size="icon" className="size-8" disabled={disabled || pending || recording} onClick={() => fileInputRef.current?.click()} aria-label="Adjuntar imagen">
              <ImageIcon aria-hidden="true" />
            </Button>
            {recorder.supported && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("size-8", recording && "text-destructive")}
                disabled={disabled || pending || recorder.status === "requesting"}
                onClick={() => (recording ? recorder.stop() : void recorder.start())}
                aria-label={recording ? "Detener grabación" : "Grabar nota de voz"}
                aria-pressed={recording}
              >
                {recording ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
              </Button>
            )}
            <Button type="button" variant="ghost" size="icon" className="size-8" disabled={disabled || pending || recording} onClick={() => setLocationOpen(true)} aria-label="Enviar ubicación">
              <MapPin aria-hidden="true" />
            </Button>
          </div>
          {recording ? (
            <p className="flex h-10 flex-1 items-center gap-2 px-2 text-sm" aria-live="polite">
              <span className="size-2 animate-pulse rounded-full bg-destructive motion-reduce:animate-none" aria-hidden="true" />
              Grabando… {formatSeconds(recorder.elapsedMs)}
            </p>
          ) : (
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
              className="max-h-40 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
              aria-label="Mensaje del cliente simulado"
            />
          )}
          <Button type="button" size="icon" className="size-10 rounded-xl" onClick={send} disabled={!canSend || recording} aria-label="Enviar">
            <SendHorizontal aria-hidden="true" />
          </Button>
        </div>
      )}
      {(localError || recorder.status === "denied") && (
        <p className="text-xs text-destructive" role="alert">
          {localError ?? "El navegador no dio permiso al micrófono."}
        </p>
      )}
      <p className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Pipeline real: lote de mensajes, tools, botones y medios como en WhatsApp. Cada turno se cobra a plataforma.</span>
        <span className="tabular-nums">
          tope {formatUsd(capUsd)} · diario {formatUsd(dailyCapUsd)}
        </span>
      </p>
      <LocationDialog open={locationOpen} onOpenChange={setLocationOpen} onSend={onSendLocation} />
    </div>
  );
}
