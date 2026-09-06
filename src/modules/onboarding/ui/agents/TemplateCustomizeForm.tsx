"use client";

import Link from "next/link";
import { useId } from "react";

import { Input } from "@/shared/components/ui/input";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { characterStyle, type CharacterDTO } from "@/modules/agents/public";
import {
  AGENT_TONES,
  EXTRA_INSTRUCTIONS_MAX,
  TONE_LABELS,
  type AgentTemplateDraft,
  type AgentTone,
} from "@/modules/onboarding/domain/agent-templates";

/**
 * Formulario de personalización de una plantilla (antes el cuerpo de un
 * `DetailSheet`; desde el onboarding «Flow» vive en la pantalla, al lado del
 * teléfono de vista previa, para que cada cambio se vea al instante). Solo lo
 * que el dueño entiende: nombre, tono, personalidad y datos clave. Modelo,
 * temperatura y límites los fija la plantilla; el enlace a Agentes deja claro
 * dónde están los ajustes avanzados, sin insinuarlos aquí. Es controlado y
 * puro: el paso guarda el borrador.
 */
export function TemplateCustomizeForm({
  draft,
  onDraftChange,
  characters,
}: {
  draft: AgentTemplateDraft;
  onDraftChange: (next: AgentTemplateDraft) => void;
  /** `null` mientras cargan; `[]` si no hay o fallaron (el selector queda deshabilitado). */
  characters: CharacterDTO[] | null;
}) {
  const nameId = useId();
  const factsId = useId();
  const patch = (partial: Partial<AgentTemplateDraft>) => onDraftChange({ ...draft, ...partial });

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <label htmlFor={nameId} className="text-sm font-medium">
          Nombre del agente
        </label>
        <Input id={nameId} value={draft.name} onChange={(event) => patch({ name: event.target.value })} placeholder="Como se presentará en el chat" />
        <p className="text-muted-foreground text-xs">Así se presenta en el chat.</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Tono</p>
        <SegmentedControl<AgentTone>
          label="Tono del agente"
          value={draft.tone}
          onValueChange={(tone) => patch({ tone })}
          surface="inline"
          items={AGENT_TONES.map((tone) => ({ value: tone, label: TONE_LABELS[tone] }))}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Personalidad</p>
        <Select value={draft.character_id ?? ""} onValueChange={(value) => patch({ character_id: value || null })} disabled={characters === null}>
          <SelectTrigger className="w-full" aria-label="Personalidad">
            <SelectValue placeholder={characters === null ? "Cargando…" : "Elige una personalidad"} />
          </SelectTrigger>
          <SelectContent>
            {(characters ?? []).map((character) => {
              const style = characterStyle(character);
              return (
                <SelectItem key={character.id} value={character.id}>
                  {character.name}
                  {style.tone ? ` · ${style.tone}` : ""}
                  {character.is_system ? " (del sistema)" : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">Define el estilo de escritura y la voz si el personaje la tiene.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={factsId} className="text-sm font-medium">
          Datos clave que debe saber
        </label>
        <Textarea
          id={factsId}
          value={draft.extra_instructions}
          onChange={(event) => patch({ extra_instructions: event.target.value })}
          rows={4}
          maxLength={EXTRA_INSTRUCTIONS_MAX}
          placeholder="Zonas de entrega, pedido mínimo, medios de pago, promociones…"
        />
        <p className="text-muted-foreground text-xs">
          Lo usa en cada respuesta. {draft.extra_instructions.length}/{EXTRA_INSTRUCTIONS_MAX}
        </p>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Modelo, temperatura y límites los fija la plantilla.{" "}
        <Link href="/admin/agents" className="text-brand hover:underline">
          Ajustes avanzados en Agentes
        </Link>
        .
      </p>
    </div>
  );
}
