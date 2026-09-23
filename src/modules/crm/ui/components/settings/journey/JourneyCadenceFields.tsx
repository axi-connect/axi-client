"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Button } from "@/shared/components/ui/button";
import {
  CADENCE_CHANNELS,
  CADENCE_CHANNEL_LABELS,
  CADENCE_WAIT_OPTIONS,
  DEFAULT_CADENCE,
  EXHAUSTED_ACTIONS,
  EXHAUSTED_ACTION_LABELS,
  waitOptionLabel,
  type CadenceChannel,
  type ExhaustedAction,
  type JourneyStageDTO,
  type PutJourneyStageDTO,
} from "@/modules/crm/domain/journey";

export type StagePatch = Partial<Pick<PutJourneyStageDTO, "cadence" | "rotting_days" | "auto_advance">>;

/** Una fila etiqueta → control de la ficha expandida. */
function FieldRow({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grouped-row flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-2.5">
      <label htmlFor={htmlFor} className="min-w-0 text-sm">
        <span className="block">{label}</span>
        {hint !== undefined && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </label>
      <div className="w-full sm:w-56">{children}</div>
    </div>
  );
}

/**
 * Campo numérico que guarda AL SALIR (blur o Enter), no en cada tecla: cada
 * cambio es un PUT del recorrido entero y teclear «12» no puede disparar dos.
 */
function NumberField({
  id,
  value,
  min,
  max,
  placeholder,
  allowEmpty,
  disabled,
  onCommit,
}: {
  id: string;
  value: number | null;
  min: number;
  max: number;
  placeholder?: string;
  /** Vacío = «sin valor» (null); si no, vacío vuelve al valor anterior. */
  allowEmpty: boolean;
  disabled: boolean;
  onCommit: (next: number | null) => void;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  useEffect(() => {
    setDraft(value === null ? "" : String(value));
  }, [value]);

  function commit(): void {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (allowEmpty) {
        if (value !== null) onCommit(null);
      } else {
        setDraft(value === null ? "" : String(value));
      }
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      setDraft(value === null ? "" : String(value));
      return;
    }
    if (parsed !== value) onCommit(parsed);
  }

  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={1}
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      className="h-8 tabular-nums"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

/**
 * La ficha expandida de una etapa: solo los campos que el modelo guarda
 * (intentos · espera · canal · tiempo máximo · al agotarse) más «Se mueve
 * sola» (`auto_advance`) y qué reglas la mueven. Cada control guarda al
 * cambiar o al salir; el padre hace el PUT.
 */
export function JourneyCadenceFields({
  stage,
  busy,
  onPatch,
}: {
  stage: JourneyStageDTO;
  busy: boolean;
  onPatch: (patch: StagePatch) => void;
}) {
  const cadence = stage.cadence;
  const id = (field: string) => `journey-${stage.stage_id}-${field}`;
  const waitOptions = cadence !== null && !CADENCE_WAIT_OPTIONS.includes(cadence.wait_hours)
    ? [...CADENCE_WAIT_OPTIONS, cadence.wait_hours].sort((a, b) => a - b)
    : CADENCE_WAIT_OPTIONS;

  return (
    <div className="border-t border-border/70 bg-foreground/[0.02]">
      {cadence === null ? (
        <div className="grouped-row flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="text-sm">
            <span className="block">Cadencia</span>
            <span className="block text-xs text-muted-foreground">
              Sin cadencia: en esta etapa el agente no insiste por su cuenta.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={busy}
            onClick={() => onPatch({ cadence: DEFAULT_CADENCE })}
          >
            Activar cadencia
          </Button>
        </div>
      ) : (
        <>
          <FieldRow label="Intentos" htmlFor={id("attempts")} hint="Cuántas veces insistimos antes de parar.">
            <NumberField
              id={id("attempts")}
              value={cadence.max_attempts}
              min={1}
              max={20}
              allowEmpty={false}
              disabled={busy}
              onCommit={(next) => {
                if (next !== null) onPatch({ cadence: { ...cadence, max_attempts: next } });
              }}
            />
          </FieldRow>

          <FieldRow label="Espera entre intentos">
            <Select
              value={String(cadence.wait_hours)}
              disabled={busy}
              onValueChange={(value) => onPatch({ cadence: { ...cadence, wait_hours: Number(value) } })}
            >
              <SelectTrigger size="sm" className="w-full tabular-nums" aria-label="Espera entre intentos">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {waitOptions.map((hours) => (
                  <SelectItem key={hours} value={String(hours)} className="tabular-nums">
                    {waitOptionLabel(hours)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Canal">
            <Select
              value={cadence.channel}
              disabled={busy}
              onValueChange={(value) =>
                onPatch({ cadence: { ...cadence, channel: value as CadenceChannel } })
              }
            >
              <SelectTrigger size="sm" className="w-full" aria-label="Canal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CADENCE_CHANNELS.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {CADENCE_CHANNEL_LABELS[channel]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </>
      )}

      <FieldRow
        label="Tiempo máximo en la etapa"
        htmlFor={id("rotting")}
        hint="En días. Pasado ese tiempo la oportunidad se marca como estancada."
      >
        <NumberField
          id={id("rotting")}
          value={stage.rotting_days}
          min={1}
          max={365}
          placeholder="Sin máximo"
          allowEmpty
          disabled={busy}
          onCommit={(next) => onPatch({ rotting_days: next })}
        />
      </FieldRow>

      {cadence !== null && (
        <FieldRow label="Al agotarse los intentos">
          <Select
            value={cadence.exhausted_action}
            disabled={busy}
            onValueChange={(value) =>
              onPatch({ cadence: { ...cadence, exhausted_action: value as ExhaustedAction } })
            }
          >
            <SelectTrigger size="sm" className="w-full" aria-label="Al agotarse los intentos">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXHAUSTED_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {EXHAUSTED_ACTION_LABELS[action]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
      )}

      <FieldRow
        label="Se mueve sola"
        htmlFor={id("auto")}
        hint={
          stage.stage_kind === "custom"
            ? "Una etapa personalizada no tiene reglas que la muevan."
            : stage.auto_advance
              ? "Sus eventos la mueven; el agente también puede."
              : "Apagado: solo una persona o el agente la mueven."
        }
      >
        <div className="flex justify-end">
          <Switch
            id={id("auto")}
            checked={stage.auto_advance}
            disabled={busy || stage.stage_kind === "custom"}
            onCheckedChange={(checked) => onPatch({ auto_advance: checked })}
          />
        </div>
      </FieldRow>

      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-2.5">
        <p className={cn("flex items-start gap-1.5 text-xs text-muted-foreground")}>
          <Zap className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {stage.stage_kind === "custom" ? (
              "Una etapa personalizada no se mueve sola ni entra en las tasas del recorrido."
            ) : stage.moves_on.length === 0 ? (
              "Ninguna regla la mueve sola. La mueven una persona o el agente."
            ) : (
              <>
                La mueven solos:{" "}
                {stage.moves_on.map((rule, index) => (
                  <span key={rule}>
                    {index > 0 && " · "}
                    <b className="font-medium text-foreground">{rule}</b>
                  </span>
                ))}
                . El agente también puede moverla si el cliente lo pide o lo descarta.
              </>
            )}
          </span>
        </p>
        {cadence !== null && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-xs text-muted-foreground"
            disabled={busy}
            onClick={() => onPatch({ cadence: null })}
          >
            Quitar cadencia
          </Button>
        )}
      </div>
    </div>
  );
}
