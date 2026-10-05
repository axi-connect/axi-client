"use client";

import { Pause, Play, Volume2 } from "lucide-react";

import { useSpeech } from "@/core/hooks/use-speech";
import { cn } from "@/core/lib/utils";

interface AssistantListenButtonProps {
  /** Identidad de lo que se lee: la isla y la burbuja con la misma clave suenan a la vez. */
  id: string;
  text: string;
  /** Al EMPEZAR una lectura (no al pausar ni al seguir): para contarla. */
  onListen?: () => void;
  className?: string;
}

/**
 * «Escuchar» en la cabecera de un mensaje (informe de la entrevista, rec. 16:
 * «Escuchar pregunta» separado de «Dictar respuesta», con reproducción y pausa
 * y el texto siempre a la vista). La voz es del navegador. Sin soporte no se
 * pinta: el texto sigue ahí.
 */
export function AssistantListenButton({ id, text, onListen, className }: AssistantListenButtonProps) {
  const speech = useSpeech(id);
  if (!speech.supported) return null;
  const label = speech.state === "speaking" ? "Pausar" : speech.state === "paused" ? "Seguir" : "Escuchar";
  const Icon = speech.state === "speaking" ? Pause : speech.state === "paused" ? Play : Volume2;
  return (
    <button
      type="button"
      aria-pressed={speech.state !== "idle"}
      onClick={() => {
        if (speech.state === "idle") onListen?.();
        speech.toggle(text);
      }}
      className={cn(
        "inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        speech.state === "idle"
          ? "bg-secondary text-muted-foreground hover:text-foreground"
          : "bg-accent-violet/12 text-accent-violet",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
