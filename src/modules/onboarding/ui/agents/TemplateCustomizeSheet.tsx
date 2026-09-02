"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { DetailSheet, DetailSheetFooter } from "@/shared/components/features/detail-sheet";
import { characterStyle, listCharacters, type CharacterDTO } from "@/modules/agents/public";
import {
  AGENT_TONES,
  EXTRA_INSTRUCTIONS_MAX,
  TONE_LABELS,
  draftBlocker,
  type AgentTemplateDTO,
  type AgentTemplateDraft,
  type AgentTone,
} from "@/modules/onboarding/domain/agent-templates";

/**
 * Sheet de personalización de una plantilla (mockup F0-B). Solo lo que el
 * dueño entiende: nombre, tono, personalidad y datos clave. Modelo,
 * temperatura y límites los fija la plantilla; el enlace a Agentes deja claro
 * dónde están los ajustes avanzados, sin insinuarlos aquí.
 */
export function TemplateCustomizeSheet({
  open,
  template,
  draft,
  saving,
  error,
  onDraftChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  template: AgentTemplateDTO | null;
  draft: AgentTemplateDraft;
  saving: boolean;
  error: string | null;
  onDraftChange: (next: AgentTemplateDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [characters, setCharacters] = useState<CharacterDTO[] | null>(null);
  const nameId = useId();
  const factsId = useId();
  const blocker = draftBlocker(draft);

  useEffect(() => {
    if (!open || characters !== null) return;
    let cancelled = false;
    listCharacters()
      .then((response) => {
        if (!cancelled) setCharacters(response.data);
      })
      .catch(() => {
        if (!cancelled) setCharacters([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, characters]);

  const patch = (partial: Partial<AgentTemplateDraft>) => onDraftChange({ ...draft, ...partial });

  return (
    <DetailSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      size="lg"
      title={template?.name ?? "Personalizar agente"}
      subtitle="Cambia lo que quieras; todo se puede ajustar después."
      renderFooter={() => (
        <DetailSheetFooter className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={saving || blocker !== null}>
            {saving ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            Crear agente
          </Button>
        </DetailSheetFooter>
      )}
    >
      <div className="flex flex-col gap-5 p-6">
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
          <Select
            value={draft.character_id ?? ""}
            onValueChange={(value) => patch({ character_id: value || null })}
            disabled={characters === null}
          >
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

        {blocker ? <p className="text-muted-foreground text-xs">{blocker}</p> : null}
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </DetailSheet>
  );
}
