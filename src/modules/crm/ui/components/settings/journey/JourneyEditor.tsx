"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";

import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Button } from "@/shared/components/ui/button";
import { Callout } from "@/shared/components/ui/callout";
import { useMyCompany } from "@/modules/companies/public";
import {
  STAGE_KIND_LABELS,
  type JourneyDTO,
  type JourneyStageDTO,
  type PutJourneyStageDTO,
  type StageKind,
} from "@/modules/crm/domain/journey";
import {
  applyJourneyTemplate,
  getJourney,
  putJourney,
} from "@/modules/crm/infrastructure/services/journey-service.adapter";
import { JourneyExplainer } from "./JourneyExplainer";
import type { StagePatch } from "./JourneyCadenceFields";
import { JourneyStageRow } from "./JourneyStageRow";
import { JourneyTemplatePicker, templateName } from "./JourneyTemplatePicker";

function toPut(stage: JourneyStageDTO): PutJourneyStageDTO {
  return {
    stage_id: stage.stage_id,
    stage_kind: stage.stage_kind,
    cadence: stage.cadence,
    rotting_days: stage.rotting_days,
    auto_advance: stage.auto_advance,
  };
}

/**
 * `/crm/settings/recorrido`: el recorrido del cliente. Plantilla por tipo de
 * negocio, explicador, y la lista de etapas con tipo semántico y cadencia.
 *
 * Guarda al salir de cada campo con un PUT del recorrido entero (es una lista
 * corta y así el servidor valida la unicidad del tipo de una vez). El cambio
 * se pinta optimista y, si el servidor lo rechaza, vuelve al estado anterior
 * con el motivo en una alerta — el 409 de tipo repetido dice cuál.
 */
export function JourneyEditor() {
  const { showAlert } = useAlert();
  const { company } = useMyCompany();
  const [journey, setJourney] = useState<JourneyDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyStage, setBusyStage] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJourney(await getJourney());
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar el recorrido"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const takenKinds = useMemo(() => {
    const set = new Set<StageKind>();
    for (const stage of journey?.stages ?? []) {
      if (stage.stage_kind !== "custom") set.add(stage.stage_kind);
    }
    return set;
  }, [journey]);

  const save = useCallback(
    async (next: JourneyStageDTO[], attempted: { stage_id: string; kind?: StageKind }) => {
      if (journey === null) return;
      const previous = journey;
      setBusyStage(attempted.stage_id);
      setJourney({ ...journey, stages: next });
      try {
        const saved = await putJourney({ stages: next.map(toPut) });
        setJourney(saved);
        showAlert({ tone: "success", title: "Recorrido guardado", autoCloseMs: 1800, open: true });
      } catch (err) {
        setJourney(previous);
        const kindTaken = isHttpError(err) && err.is("crm/stage_kind_taken");
        showAlert({
          tone: "error",
          title: kindTaken
            ? `Ya hay una etapa de tipo ${
                attempted.kind === undefined ? "ese" : STAGE_KIND_LABELS[attempted.kind]
              }; elige otro tipo`
            : errorMessage(err, "No se pudo guardar el recorrido"),
          open: true,
        });
      } finally {
        setBusyStage(null);
      }
    },
    [journey, showAlert],
  );

  const patchStage = (stageId: string, patch: StagePatch) => {
    if (journey === null) return;
    const next = journey.stages.map((stage) =>
      stage.stage_id === stageId ? { ...stage, ...patch } : stage,
    );
    void save(next, { stage_id: stageId });
  };

  const changeKind = (stageId: string, kind: StageKind) => {
    if (journey === null) return;
    const current = journey.stages.find((stage) => stage.stage_id === stageId);
    if (current === undefined || current.stage_kind === kind) return;
    const next = journey.stages.map((stage) =>
      stage.stage_id === stageId
        ? // Personalizada no tiene reglas: se apaga el avance para que la
          // ficha no prometa lo que no pasa.
          { ...stage, stage_kind: kind, auto_advance: kind === "custom" ? false : stage.auto_advance }
        : stage,
    );
    void save(next, { stage_id: stageId, kind });
  };

  const applyTemplate = async (nicheCode: string) => {
    if (journey === null) return;
    setApplying(true);
    try {
      const saved = await applyJourneyTemplate(nicheCode);
      setJourney(saved);
      const applied = saved.templates.find((template) => template.niche_code === nicheCode);
      showAlert({
        tone: "success",
        title: `Plantilla aplicada${applied === undefined ? "" : `: ${templateName(applied)}`}`,
        description: `${String(saved.stages.filter((stage) => stage.cadence !== null).length)} etapas con cadencia. Las etapas y las oportunidades siguen donde estaban.`,
        open: true,
      });
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo aplicar la plantilla"), open: true });
      throw err;
    } finally {
      setApplying(false);
    }
  };

  if (loading && journey === null) return <TableSkeleton rows={5} showHeader={false} />;

  if (error !== null && journey === null) {
    return (
      <div className="rounded-2xl border border-border bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => void load()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (journey === null) return null;

  const stages = [...journey.stages].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">El recorrido del cliente</h3>
        <p className="text-sm text-muted-foreground">
          Qué etapas pasa un contacto, cuánto insistimos en cada una y cuándo la movemos solos.
        </p>
      </div>

      <JourneyExplainer />

      <JourneyTemplatePicker
        templates={journey.templates}
        currentCode={journey.template_code}
        tenantNiche={company?.niche_code ?? null}
        stagesWithCadence={stages.filter((stage) => stage.cadence !== null).length}
        busy={applying || busyStage !== null}
        onApply={(code) => applyTemplate(code).catch(() => undefined)}
      />

      <section className="rounded-2xl border border-border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5 pb-1">
          <h4 className="text-[11.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Etapas
          </h4>
          <span className="text-xs text-muted-foreground">Se guarda al salir de cada campo</span>
        </div>
        {stages.length === 0 ? (
          <p className="px-4 pt-2 pb-4 text-sm text-muted-foreground">
            El pipeline no tiene etapas. Créalas en Pipelines y vuelve aquí para darles tipo y cadencia.
          </p>
        ) : (
          <ul className="grouped-list">
            {stages.map((stage) => (
              <JourneyStageRow
                key={stage.stage_id}
                stage={stage}
                takenKinds={takenKinds}
                expanded={expanded === stage.stage_id}
                busy={busyStage === stage.stage_id || applying}
                onToggle={() => setExpanded((prev) => (prev === stage.stage_id ? null : stage.stage_id))}
                onPatch={(patch) => patchStage(stage.stage_id, patch)}
                onKindChange={(kind) => changeKind(stage.stage_id, kind)}
              />
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Los recordatorios de la cita (24 h y 2 h antes) los manda{" "}
        <b className="font-medium text-foreground">Agenda</b>; aquí solo se decide cuánto insistir si la
        cita no se cumple.
      </p>
      <Callout tone="neutral" icon={Info}>
        Ganado y Perdido no son etapas: son el estado de la oportunidad. Reordenar, renombrar y colorear
        etapas sigue en <b className="font-medium text-foreground">Pipelines</b>. Los días de enfriamiento
        de una etapa se leen aquí como «tiempo máximo». Una etapa{" "}
        <b className="font-medium text-foreground">Personalizada</b> no se mueve sola ni entra en las tasas.
      </Callout>
    </div>
  );
}
