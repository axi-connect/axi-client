"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { StatusBadge } from "@/shared/components/features/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  JOURNEY_BADGES,
  STAGE_KIND_HINTS,
  STAGE_KIND_LABELS,
  STAGE_KIND_ORDER,
  cadenceSummary,
  type JourneyStageDTO,
  type StageKind,
} from "@/modules/crm/domain/journey";
import { JourneyCadenceFields, type StagePatch } from "./JourneyCadenceFields";
import { STAGE_KIND_ICONS } from "./stage-kind-icons";

const KIND_OPTIONS: readonly StageKind[] = [...STAGE_KIND_ORDER, "custom"];

/**
 * Una etapa de la lista: nombre y resumen de la cadencia a la izquierda
 * (botón que despliega la ficha), el tipo semántico como `Select` compacto y
 * el aviso «No se mueve sola» si es personalizada. Son controles HERMANOS,
 * nunca uno dentro de otro: un select dentro de un botón no es HTML válido.
 */
export function JourneyStageRow({
  stage,
  takenKinds,
  expanded,
  busy,
  onToggle,
  onPatch,
  onKindChange,
}: {
  stage: JourneyStageDTO;
  /** Kinds que ya usa OTRA etapa del pipeline: se ofrecen deshabilitados. */
  takenKinds: ReadonlySet<StageKind>;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onPatch: (patch: StagePatch) => void;
  onKindChange: (kind: StageKind) => void;
}) {
  const Icon = STAGE_KIND_ICONS[stage.stage_kind];
  const panelId = `journey-stage-${stage.stage_id}`;

  return (
    <li className={cn("grouped-row reveal-group", expanded && "bg-foreground/[0.02]")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 md:flex-nowrap">
        <button
          type="button"
          aria-expanded={expanded}
          // Solo cuando el panel existe: apuntar a un id que no está en el DOM
          // es un error de a11y (aria-controls debe referenciar algo).
          {...(expanded ? { "aria-controls": panelId } : {})}
          onClick={onToggle}
          className="min-w-0 flex-1 basis-full rounded-lg text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none md:basis-auto"
        >
          <span className="block text-[15px] font-medium">{stage.name}</span>
          <span className="block text-xs text-muted-foreground tabular-nums">
            {stage.stage_kind === "custom"
              ? "No se mueve sola ni entra en las tasas del recorrido"
              : cadenceSummary(stage)}
          </span>
        </button>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {stage.stage_kind === "custom" && (
            <StatusBadge status="custom" map={JOURNEY_BADGES} appearance="dot" />
          )}
          <Select
            value={stage.stage_kind}
            disabled={busy}
            onValueChange={(value) => onKindChange(value as StageKind)}
          >
            <SelectTrigger
              size="sm"
              className="w-44 rounded-lg"
              aria-label={`Tipo de la etapa ${stage.name}`}
            >
              <Icon className="size-3.5 text-muted-foreground" aria-hidden />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* Solo el label: Radix repite el contenido del ítem en el
                  trigger, y un icono o una frase ahí lo desbordarían. */}
              {KIND_OPTIONS.map((kind) => {
                const taken = kind !== stage.stage_kind && takenKinds.has(kind);
                return (
                  <SelectItem key={kind} value={kind} disabled={taken}>
                    {STAGE_KIND_LABELS[kind]}
                    {taken ? " · ya usado" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {/* Decorativo: el botón del nombre es el que despliega. */}
          <ChevronDown
            aria-hidden
            className={cn(
              "hover-reveal hidden size-4 text-muted-foreground transition-transform md:block",
              expanded && "rotate-180",
            )}
          />
        </div>
      </div>

      {expanded && (
        <div id={panelId}>
          <p className="px-4 pb-2.5 text-xs text-muted-foreground">{STAGE_KIND_HINTS[stage.stage_kind]}</p>
          <JourneyCadenceFields stage={stage} busy={busy} onPatch={onPatch} />
        </div>
      )}
    </li>
  );
}
