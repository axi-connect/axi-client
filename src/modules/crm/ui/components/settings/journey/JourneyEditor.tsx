"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  autoAdvanceAfterKindChange,
  readJourneySwitches,
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
 * Qué decir cuando el servidor rechaza un guardado. El 409 de tipo repetido
 * nombra el tipo que se intentó; otro 409 (el pipeline cambió por debajo) pide
 * recargar; el resto va por `errorMessage` (nunca un código crudo).
 */
export function saveErrorTitle(err: unknown, attemptedKind?: StageKind): string {
  if (isHttpError(err) && err.is("crm/stage_kind_taken")) {
    return attemptedKind === undefined
      ? "Ya hay una etapa con ese tipo; elige otro tipo"
      : `Ya hay una etapa de tipo ${STAGE_KIND_LABELS[attemptedKind]}; elige otro tipo`;
  }
  if (isHttpError(err) && err.status === 409) {
    return "No se pudo guardar: el recorrido cambió mientras editabas. Recarga la página";
  }
  return errorMessage(err, "No se pudo guardar el recorrido");
}

/**
 * `/crm/settings/recorrido`: el recorrido del cliente. Plantilla por tipo de
 * negocio, explicador, y la lista de etapas con tipo semántico y cadencia.
 *
 * Cada campo guarda al salir con un PUT de SOLO su etapa (el servidor acepta
 * la lista parcial). El estado vive en un ref que se actualiza en la misma
 * llamada que el `setState`, así dos guardados seguidos —blur y clic— leen
 * siempre lo último. Por etapa: un contador de secuencia que descarta la
 * respuesta vieja si llegó otra después, una foto previa a la que volver si
 * el servidor rechaza, y su propio `busy`; guardar la etapa A no congela la B.
 */
export function JourneyEditor() {
  const { showAlert } = useAlert();
  const { company } = useMyCompany();
  const [journey, setJourney] = useState<JourneyDTO | null>(null);
  const journeyRef = useRef<JourneyDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyStages, setBusyStages] = useState<ReadonlySet<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const seqRef = useRef(new Map<string, number>());
  const snapshotRef = useRef(new Map<string, JourneyStageDTO>());

  /** Ref y estado a la vez: quien guarde después lee lo que acaba de cambiar. */
  const commit = useCallback((next: JourneyDTO | null) => {
    journeyRef.current = next;
    setJourney(next);
  }, []);

  const replaceStage = useCallback(
    (stage: JourneyStageDTO) => {
      const current = journeyRef.current;
      if (current === null) return;
      commit({
        ...current,
        stages: current.stages.map((item) => (item.stage_id === stage.stage_id ? stage : item)),
      });
    },
    [commit],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      commit(await getJourney());
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar el recorrido"));
    } finally {
      setLoading(false);
    }
  }, [commit]);

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
    (next: JourneyStageDTO, attemptedKind?: StageKind) => {
      const id = next.stage_id;
      const previous = journeyRef.current?.stages.find((stage) => stage.stage_id === id);
      // La foto es la de ANTES del primer guardado en vuelo: si el segundo
      // falla, se vuelve a lo que el servidor tenía, no a un intento a medias.
      if (previous !== undefined && !snapshotRef.current.has(id)) snapshotRef.current.set(id, previous);
      const seq = (seqRef.current.get(id) ?? 0) + 1;
      seqRef.current.set(id, seq);
      replaceStage(next);
      setBusyStages((prev) => new Set(prev).add(id));

      const isLatest = () => seqRef.current.get(id) === seq;
      putJourney({ stages: [toPut(next)] })
        .then((saved) => {
          if (!isLatest()) return;
          const fresh = saved.stages.find((stage) => stage.stage_id === id);
          if (fresh !== undefined) replaceStage(fresh);
          snapshotRef.current.delete(id);
          showAlert({ tone: "success", title: "Recorrido guardado" });
        })
        .catch((err: unknown) => {
          if (!isLatest()) return;
          const snapshot = snapshotRef.current.get(id);
          snapshotRef.current.delete(id);
          if (snapshot !== undefined) replaceStage(snapshot);
          showAlert({ tone: "error", title: "No se pudo guardar", description: saveErrorTitle(err, attemptedKind) });
        })
        .finally(() => {
          if (!isLatest()) return;
          setBusyStages((prev) => {
            const nextSet = new Set(prev);
            nextSet.delete(id);
            return nextSet;
          });
        });
    },
    [replaceStage, showAlert],
  );

  const patchStage = (stageId: string, patch: StagePatch) => {
    const current = journeyRef.current?.stages.find((stage) => stage.stage_id === stageId);
    if (current === undefined) return;
    save({ ...current, ...patch });
  };

  const changeKind = (stageId: string, kind: StageKind) => {
    const current = journeyRef.current?.stages.find((stage) => stage.stage_id === stageId);
    if (current === undefined || current.stage_kind === kind) return;
    save(
      {
        ...current,
        stage_kind: kind,
        auto_advance: autoAdvanceAfterKindChange(current.stage_kind, kind, current.auto_advance),
      },
      kind,
    );
  };

  const applyTemplate = async (nicheCode: string) => {
    setApplying(true);
    try {
      const saved = await applyJourneyTemplate(nicheCode);
      // Los interruptores son de solo lectura y los da el GET: si la respuesta
      // de la plantilla no los trae, se conservan los que había (Q8).
      commit({ ...saved, switches: saved.switches ?? journeyRef.current?.switches });
      const applied = saved.templates.find((template) => template.niche_code === nicheCode);
      const withCadence = saved.stages.filter((stage) => stage.cadence !== null).length;
      showAlert({
        tone: "success",
        title: `Plantilla aplicada${applied === undefined ? "" : `: ${templateName(applied)}`}`,
        description: `${String(withCadence)} ${withCadence === 1 ? "etapa" : "etapas"} con cadencia. Las etapas y las oportunidades siguen donde estaban.`,
      });
    } catch (err) {
      showAlert({ tone: "error", title: "No se pudo aplicar la plantilla", description: errorMessage(err, "Inténtalo de nuevo en un momento.") });
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
  const switches = readJourneySwitches(journey);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">El recorrido del cliente</h3>
        <p className="text-sm text-muted-foreground">
          Qué etapas pasa un contacto, cuánto insistimos en cada una y cuándo la movemos solos.
        </p>
      </div>

      <JourneyExplainer switches={switches} />

      <JourneyTemplatePicker
        templates={journey.templates}
        currentCode={journey.template_code}
        tenantNiche={company?.niche_code ?? null}
        stagesWithCadence={stages.filter((stage) => stage.cadence !== null).length}
        busy={applying || busyStages.size > 0}
        onApply={applyTemplate}
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
                switches={switches}
                takenKinds={takenKinds}
                expanded={expanded === stage.stage_id}
                busy={busyStages.has(stage.stage_id) || applying}
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
