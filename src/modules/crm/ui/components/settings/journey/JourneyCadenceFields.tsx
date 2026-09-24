"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

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
  autoAdvanceHint,
  waitOptionLabel,
  type CadenceChannel,
  type ExhaustedAction,
  type JourneyStageDTO,
  type JourneySwitches,
  type PutJourneyStageDTO,
} from "@/modules/crm/domain/journey";

export type StagePatch = Partial<Pick<PutJourneyStageDTO, "cadence" | "rotting_days" | "auto_advance">>;

/**
 * Una fila etiqueta → control de la ficha expandida. El hint va FUERA del
 * `<label>` (con su propio id para `aria-describedby`): un label largo se lee
 * entero cada vez que el control toma el foco.
 */
function FieldRow({
  label,
  hint,
  hintId,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  hintId?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grouped-row flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-2.5">
      <div className="min-w-0 text-sm">
        <label htmlFor={htmlFor} className="block">
          {label}
        </label>
        {hint !== undefined && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      <div className="w-full sm:w-56">{children}</div>
    </div>
  );
}

/**
 * Campo numérico que guarda AL SALIR (blur o Enter), no en cada tecla: cada
 * cambio es un PUT y teclear «12» no puede disparar dos. Un valor fuera de
 * rango no se descarta en silencio: se queda en el campo con el error debajo.
 */
function NumberField({
  id,
  value,
  min,
  max,
  placeholder,
  allowEmpty,
  disabled,
  describedBy,
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
  describedBy?: string;
  onCommit: (next: number | null) => void;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const [error, setError] = useState<string | null>(null);
  const errorId = `${id}-error`;
  useEffect(() => {
    setDraft(value === null ? "" : String(value));
    setError(null);
  }, [value]);

  function commit(): void {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (allowEmpty) {
        setError(null);
        if (value !== null) onCommit(null);
      } else {
        setDraft(value === null ? "" : String(value));
        setError(null);
      }
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      setError(`Escribe un número entero entre ${String(min)} y ${String(max)}`);
      return;
    }
    setError(null);
    if (parsed !== value) onCommit(parsed);
  }

  return (
    <div>
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
        aria-invalid={error !== null || undefined}
        aria-describedby={[describedBy, error === null ? undefined : errorId].filter(Boolean).join(" ") || undefined}
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
      {error !== null && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
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
  switches,
  busy,
  onPatch,
}: {
  stage: JourneyStageDTO;
  /** Lo que de verdad mueve etapas en el negocio (Q8): la pista no promete lo apagado. */
  switches: JourneySwitches;
  busy: boolean;
  onPatch: (patch: StagePatch) => void;
}) {
  const cadence = stage.cadence;
  const id = (field: string) => `journey-${stage.stage_id}-${field}`;
  const waitOptions =
    cadence !== null && !CADENCE_WAIT_OPTIONS.includes(cadence.wait_hours)
      ? [...CADENCE_WAIT_OPTIONS, cadence.wait_hours].sort((a, b) => a - b)
      : CADENCE_WAIT_OPTIONS;
  const autoHint = autoAdvanceHint(stage, switches);

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
          <FieldRow
            label="Intentos"
            htmlFor={id("attempts")}
            hint="Cuántas veces insistimos antes de parar."
            hintId={id("attempts-hint")}
          >
            <NumberField
              id={id("attempts")}
              value={cadence.max_attempts}
              min={1}
              max={20}
              allowEmpty={false}
              disabled={busy}
              describedBy={id("attempts-hint")}
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
              onValueChange={(value) => onPatch({ cadence: { ...cadence, channel: value as CadenceChannel } })}
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
        hintId={id("rotting-hint")}
      >
        <NumberField
          id={id("rotting")}
          value={stage.rotting_days}
          min={1}
          max={365}
          placeholder="Sin máximo"
          allowEmpty
          disabled={busy}
          describedBy={id("rotting-hint")}
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

      <FieldRow label="Se mueve sola" htmlFor={id("auto")} hint={autoHint} hintId={id("auto-hint")}>
        <div className="flex justify-end">
          <Switch
            id={id("auto")}
            checked={stage.auto_advance}
            disabled={busy || stage.stage_kind === "custom"}
            aria-describedby={id("auto-hint")}
            onCheckedChange={(checked) => onPatch({ auto_advance: checked })}
          />
        </div>
      </FieldRow>

      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-2.5">
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
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
