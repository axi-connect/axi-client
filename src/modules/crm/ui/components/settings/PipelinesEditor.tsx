"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Plus, Star, Trash2 } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { TableSkeleton } from "@/shared/components/features/loading";
import type { PipelineDTO, PipelineStageDTO } from "@/modules/crm/domain/deal";
import {
  createPipeline,
  createStage,
  deletePipeline,
  deleteStage,
  listPipelines,
  reorderStages,
  updatePipeline,
  updateStage,
} from "@/modules/crm/infrastructure/services/pipelines-service.adapter";

type PendingStageDelete = { stage: PipelineStageDTO };
type PendingPipelineDelete = { pipeline: PipelineDTO };

/** Fila de etapa reordenable con edición inline (guarda al perder el foco). */
function StageRow({
  stage,
  onPatch,
  onDelete,
}: {
  stage: PipelineStageDTO;
  onPatch: (stageId: string, dto: Partial<PipelineStageDTO>) => void;
  onDelete: (stage: PipelineStageDTO) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  });
  const [name, setName] = useState(stage.name);
  const [probability, setProbability] = useState(String(stage.probability_pct));
  const [rotting, setRotting] = useState(stage.rotting_days !== null ? String(stage.rotting_days) : "");

  useEffect(() => {
    setName(stage.name);
    setProbability(String(stage.probability_pct));
    setRotting(stage.rotting_days !== null ? String(stage.rotting_days) : "");
  }, [stage]);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-2.5",
        isDragging && "z-10 opacity-70 shadow-float",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reordenar etapa ${stage.name}`}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>

      <input
        type="color"
        value={stage.color ?? "#a1a1aa"}
        onChange={(e) => onPatch(stage.id, { color: e.target.value })}
        aria-label={`Color de ${stage.name}`}
        className="size-7 shrink-0 cursor-pointer rounded-md border border-input bg-background p-0.5"
      />

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name !== stage.name) onPatch(stage.id, { name: name.trim() });
        }}
        className="h-8 w-40 flex-1 sm:flex-none"
        aria-label="Nombre de la etapa"
      />

      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        prob.
        <Input
          inputMode="numeric"
          value={probability}
          onChange={(e) => setProbability(e.target.value)}
          onBlur={() => {
            const value = Number(probability);
            if (Number.isFinite(value) && value >= 0 && value <= 100 && value !== stage.probability_pct) {
              onPatch(stage.id, { probability_pct: value });
            } else {
              setProbability(String(stage.probability_pct));
            }
          }}
          className="h-8 w-14 text-right tabular-nums"
          aria-label={`Probabilidad de ${stage.name}`}
        />
        %
      </label>

      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        estanca a los
        <Input
          inputMode="numeric"
          value={rotting}
          placeholder="—"
          onChange={(e) => setRotting(e.target.value)}
          onBlur={() => {
            const trimmed = rotting.trim();
            const value = trimmed === "" ? null : Number(trimmed);
            if (value === null || (Number.isFinite(value) && value >= 1 && value <= 365)) {
              if (value !== stage.rotting_days) onPatch(stage.id, { rotting_days: value });
            } else {
              setRotting(stage.rotting_days !== null ? String(stage.rotting_days) : "");
            }
          }}
          className="h-8 w-14 text-right tabular-nums"
          aria-label={`Días de estancamiento de ${stage.name}`}
        />
        días
      </label>

      <Button
        variant="ghost"
        size="icon"
        className="ml-auto size-7 text-muted-foreground hover:text-destructive"
        aria-label={`Eliminar etapa ${stage.name}`}
        onClick={() => onDelete(stage)}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  );
}

/**
 * Editor de pipelines y etapas (gate crm:manage): lista de pipelines a la
 * izquierda; etapas reordenables (PUT con la lista COMPLETA) con edición
 * inline a la derecha. Borrados con deals → 409 → selección de destino.
 */
export function PipelinesEditor() {
  const { showAlert, showModal, closeModal } = useAlert();
  const [pipelines, setPipelines] = useState<PipelineDTO[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [stageDelete, setStageDelete] = useState<PendingStageDelete | null>(null);
  const [pipelineDelete, setPipelineDelete] = useState<PendingPipelineDelete | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const selected = pipelines?.find((pipeline) => pipeline.id === selectedId) ?? null;

  const load = async () => {
    try {
      const list = await listPipelines();
      setPipelines(list);
      setSelectedId((prev) =>
        prev !== null && list.some((p) => p.id === prev)
          ? prev
          : (list.find((p) => p.is_default) ?? list[0])?.id ?? null,
      );
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudieron cargar los pipelines"), open: true });
      setPipelines([]);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Toda mutación devuelve el PipelineDTO completo: se reemplaza en la lista. */
  const applyPipeline = (fresh: PipelineDTO) => {
    setPipelines((prev) =>
      prev === null ? prev : prev.map((pipeline) => (pipeline.id === fresh.id ? fresh : pipeline)),
    );
  };

  const run = async (operation: () => Promise<PipelineDTO>, successTitle?: string) => {
    try {
      applyPipeline(await operation());
      if (successTitle !== undefined) showAlert({ tone: "success", title: successTitle, open: true });
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo guardar"), open: true });
    }
  };

  const handleReorder = (event: DragEndEvent) => {
    if (selected === null || event.over === null || event.active.id === event.over.id) return;
    const ids = selected.stages.map((stage) => stage.id);
    const next = arrayMove(
      ids,
      ids.indexOf(String(event.active.id)),
      ids.indexOf(String(event.over.id)),
    );
    // Optimista: reordenar localmente; el PUT devuelve la verdad (422 → recarga)
    applyPipeline({
      ...selected,
      stages: next
        .map((id) => selected.stages.find((stage) => stage.id === id))
        .filter((stage): stage is PipelineStageDTO => stage !== undefined),
    });
    reorderStages(selected.id, next)
      .then(applyPipeline)
      .catch((err: unknown) => {
        showAlert({ tone: "error", title: errorMessage(err, "No se pudo reordenar"), open: true });
        void load();
      });
  };

  const handleDeleteStage = async (stage: PipelineStageDTO, moveTo?: string) => {
    if (selected === null) return;
    try {
      applyPipeline(await deleteStage(selected.id, stage.id, moveTo));
      setStageDelete(null);
      setDeleteTarget(null);
      showAlert({ tone: "success", title: "Etapa eliminada", open: true });
    } catch (err) {
      if (isHttpError(err) && err.is("crm/stage_in_use") && moveTo === undefined) {
        setStageDelete({ stage }); // pide destino
        return;
      }
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar la etapa"), open: true });
    }
  };

  const handleDeletePipeline = async (pipeline: PipelineDTO, moveTo?: string) => {
    try {
      await deletePipeline(pipeline.id, moveTo);
      setPipelineDelete(null);
      setDeleteTarget(null);
      closeModal();
      showAlert({ tone: "success", title: "Pipeline eliminado", open: true });
      setSelectedId(null);
      void load();
    } catch (err) {
      closeModal();
      if (isHttpError(err) && err.is("crm/pipeline_in_use") && moveTo === undefined) {
        setPipelineDelete({ pipeline });
        return;
      }
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar el pipeline"), open: true });
    }
  };

  if (pipelines === null) return <TableSkeleton rows={5} showHeader={false} />;

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Lista de pipelines */}
      <div className="space-y-2">
        <ul className="space-y-1.5">
          {pipelines.map((pipeline) => (
            <li key={pipeline.id}>
              <button
                type="button"
                aria-pressed={pipeline.id === selectedId}
                onClick={() => setSelectedId(pipeline.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                  pipeline.id === selectedId
                    ? "border-primary/40 bg-accent font-medium"
                    : "border-border hover:bg-accent/50",
                )}
              >
                <span className="min-w-0 truncate">{pipeline.name}</span>
                {pipeline.is_default && (
                  <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                    <Star className="size-2.5" aria-hidden /> default
                  </Badge>
                )}
              </button>
            </li>
          ))}
        </ul>

        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newPipelineName.trim();
            if (!name) return;
            createPipeline({ name })
              .then((created) => {
                setNewPipelineName("");
                setPipelines((prev) => (prev === null ? prev : [...prev, created]));
                setSelectedId(created.id);
              })
              .catch((err: unknown) =>
                showAlert({ tone: "error", title: errorMessage(err, "No se pudo crear el pipeline"), open: true }),
              );
          }}
        >
          <Input
            value={newPipelineName}
            onChange={(e) => setNewPipelineName(e.target.value)}
            placeholder="Nuevo pipeline…"
            className="h-9"
            aria-label="Nombre del nuevo pipeline"
          />
          <Button type="submit" size="icon" variant="outline" className="size-9 shrink-0" aria-label="Crear pipeline">
            <Plus className="size-4" />
          </Button>
        </form>
      </div>

      {/* Etapas del pipeline seleccionado */}
      {selected !== null && (
        <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Etapas de “{selected.name}”</h3>
            <div className="flex items-center gap-2">
              {!selected.is_default && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => void run(() => updatePipeline(selected.id, { is_default: true }), "Ahora es el pipeline default")}
                >
                  <Star className="size-3.5" />
                  Hacer default
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-destructive hover:text-destructive"
                onClick={() =>
                  showModal({
                    title: "Eliminar pipeline",
                    description: `¿Eliminar “${selected.name}”? Si tiene oportunidades abiertas te pediremos a dónde moverlas.`,
                    actions: [
                      { label: "Cancelar", variant: "outline", asClose: true, id: "pl-del-cancel" },
                      {
                        label: "Eliminar",
                        variant: "destructive",
                        asClose: false,
                        id: "pl-del-confirm",
                        onClick: () => void handleDeletePipeline(selected),
                      },
                    ],
                    className: "sm:max-w-md",
                  })
                }
              >
                <Trash2 className="size-3.5" />
                Eliminar
              </Button>
            </div>
          </div>

          <DndContext sensors={sensors} onDragEnd={handleReorder}>
            <SortableContext
              items={selected.stages.map((stage) => stage.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {selected.stages.map((stage) => (
                  <StageRow
                    key={stage.id}
                    stage={stage}
                    onPatch={(stageId, dto) =>
                      void run(() => updateStage(selected.id, stageId, dto))
                    }
                    onDelete={(stage) => void handleDeleteStage(stage)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newStageName.trim();
              if (!name) return;
              void run(
                () => createStage(selected.id, { name, probability_pct: 50 }),
                "Etapa añadida al final",
              ).then(() => setNewStageName(""));
            }}
          >
            <Input
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder="Nueva etapa…"
              className="h-9 max-w-60"
              aria-label="Nombre de la nueva etapa"
            />
            <Button type="submit" size="sm" variant="outline" className="rounded-full">
              <Plus className="size-3.5" />
              Añadir etapa
            </Button>
          </form>
        </div>
      )}

      {/* 409 stage_in_use: elegir destino */}
      {stageDelete !== null && selected !== null && (
        <Modal
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setStageDelete(null);
              setDeleteTarget(null);
            }
          }}
          config={{
            title: "La etapa tiene oportunidades",
            description: `Elige a qué etapa mover las oportunidades de “${stageDelete.stage.name}” antes de eliminarla.`,
            className: "sm:max-w-md",
            actions: [],
          }}
        >
          <div className="space-y-4">
            <Select value={deleteTarget ?? undefined} onValueChange={setDeleteTarget}>
              <SelectTrigger className="w-full" aria-label="Etapa destino">
                <SelectValue placeholder="Mover oportunidades a…" />
              </SelectTrigger>
              <SelectContent>
                {selected.stages
                  .filter((stage) => stage.id !== stageDelete.stage.id)
                  .map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStageDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={deleteTarget === null}
                onClick={() => void handleDeleteStage(stageDelete.stage, deleteTarget ?? undefined)}
              >
                <Check className="size-4" />
                Mover y eliminar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 409 pipeline_in_use: elegir pipeline destino */}
      {pipelineDelete !== null && (
        <Modal
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setPipelineDelete(null);
              setDeleteTarget(null);
            }
          }}
          config={{
            title: "El pipeline tiene oportunidades abiertas",
            description: `Elige a qué pipeline mover las oportunidades de “${pipelineDelete.pipeline.name}”.`,
            className: "sm:max-w-md",
            actions: [],
          }}
        >
          <div className="space-y-4">
            <Select value={deleteTarget ?? undefined} onValueChange={setDeleteTarget}>
              <SelectTrigger className="w-full" aria-label="Pipeline destino">
                <SelectValue placeholder="Mover oportunidades a…" />
              </SelectTrigger>
              <SelectContent>
                {pipelines
                  .filter((pipeline) => pipeline.id !== pipelineDelete.pipeline.id)
                  .map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPipelineDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={deleteTarget === null}
                onClick={() =>
                  void handleDeletePipeline(pipelineDelete.pipeline, deleteTarget ?? undefined)
                }
              >
                <Check className="size-4" />
                Mover y eliminar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
