"use client";

import { Info, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { salesWhatsAppUrl } from "@/core/config/env";
import { cn } from "@/core/lib/utils";
import { VOICE_SETTING_RANGES, type VoiceFormValues } from "@/modules/agents/domain/agent-voice";
import type { AiVoiceDTO, VoiceSettingsDTO } from "@/modules/agents/domain/voice";
import { VoiceRangeField } from "@/modules/agents/ui/components/VoiceRangeField";
import { VoiceSelector } from "@/modules/agents/ui/components/VoiceSelector";
import { SamplePlayButton, useAudioSample } from "@/shared/components/features/audio-sample";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/components/ui/accordion";

/**
 * La voz del agente en el estudio: el selector del catálogo curado, la muestra
 * de la voz elegida al lado (un solo `<audio>`) y los tres ajustes plegados. Con
 * la voz de EMPRESA apagada el bloque se deshabilita y explica dónde encenderla
 * — nunca se oculta sin decir por qué (`VoicePolicySection` hacía lo mismo).
 * Mientras suena la muestra, avisa al escenario para que el personaje hable.
 */
export function VoicePicker({
  voices,
  voiceSettings,
  value,
  onChange,
  onPreviewPlaying,
  className,
}: {
  voices: AiVoiceDTO[] | null;
  voiceSettings: VoiceSettingsDTO | null;
  value: VoiceFormValues;
  onChange: (next: VoiceFormValues) => void;
  onPreviewPlaying?: (playing: boolean) => void;
  className?: string;
}) {
  // Desconocido (null) no bloquea: solo un `false` explícito apaga el bloque
  const voiceOff = voiceSettings !== null && !voiceSettings.ai_enabled;
  const selected = voices?.find((voice) => voice.external_voice_id === value.voice_id) ?? null;
  const { playingId, loading, toggle } = useAudioSample();
  const playing = selected !== null && playingId === selected.external_voice_id;

  useEffect(() => {
    onPreviewPlaying?.(playing);
  }, [onPreviewPlaying, playing]);

  const patch = (partial: Partial<VoiceFormValues>) => onChange({ ...value, ...partial });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {voiceOff ? (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-secondary p-3 text-xs">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
          <span>
            <b className="font-medium">Las notas de voz están apagadas para tu empresa.</b> Las activa el equipo de axi:{" "}
            <a
              href={salesWhatsAppUrl("Hola, quiero activar las notas de voz para mi empresa.")}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline-offset-3 hover:underline"
            >
              escríbenos por WhatsApp
            </a>{" "}
            y, cuando estén encendidas, vuelve aquí para elegir cómo suena este agente.
          </span>
        </p>
      ) : null}
      <fieldset disabled={voiceOff} className={cn("flex flex-col gap-2", voiceOff && "opacity-55")}>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <VoiceSelector voices={voices} value={value.voice_id} onChange={(voice_id) => patch({ voice_id })} disabled={voiceOff} />
          </div>
          {selected ? (
            <SamplePlayButton
              name={selected.name}
              url={selected.preview_url}
              playing={playing}
              loading={loading && playing}
              onToggle={() => toggle(selected.external_voice_id, selected.preview_url)}
            />
          ) : null}
        </div>
        {value.voice_id === "" ? (
          <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            <Info className="size-3.5" aria-hidden />
            Elige una voz para que responda con notas de voz cuando el cliente le hable.
          </p>
        ) : (
          <Accordion type="single" collapsible className="rounded-xl border border-border">
            <AccordionItem value="tune" className="border-b-0">
              <AccordionTrigger className="px-3 py-2.5 text-[12.5px] text-muted-foreground hover:no-underline">Ajustar voz</AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <div className="grid gap-2.5 pt-1">
                  <VoiceRangeField label="Estabilidad" value={value.stability} onChange={(stability) => patch({ stability })} {...VOICE_SETTING_RANGES.stability} disabled={voiceOff} />
                  <VoiceRangeField label="Similitud" value={value.similarity_boost} onChange={(similarity_boost) => patch({ similarity_boost })} {...VOICE_SETTING_RANGES.similarity_boost} disabled={voiceOff} />
                  <VoiceRangeField label="Velocidad" value={value.speed} onChange={(speed) => patch({ speed })} {...VOICE_SETTING_RANGES.speed} disabled={voiceOff} format={(v) => `${v.toFixed(2)}×`} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </fieldset>
    </div>
  );
}
