"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Check, GripVertical, Minus, Plus, Star, Trash2 } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import { StatePill } from "@/shared/components/features/bento";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { TableSkeleton } from "@/shared/components/features/loading";
import type { BoardDTO, PipelineDTO, PipelineStageDTO } from "@/modules/crm/domain/deal";
import { formatMillions } from "@/core/lib/format";
import {
  createPipeline,
  createStage,
  deletePipeline,
  deleteStage,
  getBoard,
  listPipelines,
  reorderStages,
  updatePipeline,
  updateStage,
} from "@/modules/crm/infrastructure/services/pipelines-service.adapter";

type PendingStageDelete = { stage: PipelineStageDTO };
type PendingPipelineDelete = { pipeline: PipelineDTO };

/** Los − / + mueven la probabilidad de 5 en 5 y guardan solos al dejar de tocar. */
const PROBABILITY_STEP = 5;
const PROBABILITY_SAVE_DELAY_MS = 600;

/**
 * Fila de etapa reordenable con edición inline. Nombre y enfriamiento guardan
 * al perder el foco; la probabilidad, además, con − / +: el PATCH sale 600 ms
 * después del último toque, así cinco clics son un guardado y no cinco.
 */
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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setName(stage.name);
    // Con un guardado de probabilidad en espera, lo de la pantalla es lo último.
    if (saveTimer.current === null) setProbability(String(stage.probability_pct));
    setRotting(stage.rotting_days !== null ? String(stage.rotting_days) : "");
  }, [stage]);

  useEffect(() => () => {
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
  }, []);

  const commitProbability = (value: number) => {
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (value !== stage.probability_pct) onPatch(stage.id, { probability_pct: value });
  };

  const step = (delta: number) => {
    const current = Number(probability);
    const base = Number.isFinite(current) ? current : stage.probability_pct;
    const next = Math.min(100, Math.max(0, Math.round((base + delta) / PROBABILITY_STEP) * PROBABILITY_STEP));
    setProbability(String(next));
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => commitProbability(next), PROBABILITY_SAVE_DELAY_MS);
  };

  const probabilityValue = Number(probability);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "grid grid-cols-[2.25rem_2.25rem_minmax(0,1fr)_2.25rem] items-center gap-x-2 gap-y-2 border-t border-border px-3 py-2.5 @min-[46rem]:grid-cols-[2.25rem_2.25rem_minmax(0,1fr)_auto_2.25rem] @min-[46rem]:px-4",
        isDragging && "relative z-10 rounded-2xl bg-card opacity-80 shadow-float",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reordenar etapa ${stage.name}`}
        className="grid size-9 cursor-grab touch-none place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>

      {/* El color como punto: el input nativo queda encima, invisible, y
          abre el selector del sistema con el objetivo entero (36 px). */}
      <label className="relative grid size-9 cursor-pointer place-items-center rounded-full hover:bg-muted">
        <span aria-hidden className="size-3.5 rounded-full ring-1 ring-foreground/10" style={{ backgroundColor: stage.color ?? "#a1a1aa" }} />
        <input
          type="color"
          value={stage.color ?? "#a1a1aa"}
          onChange={(e) => onPatch(stage.id, { color: e.target.value })}
          aria-label={`Color de ${stage.name}`}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name !== stage.name) onPatch(stage.id, { name: name.trim() });
        }}
        className="h-9 min-w-0 rounded-xl"
        aria-label="Nombre de la etapa"
        title={name}
      />

      <Button
        variant="ghost"
        size="icon"
        className="size-9 rounded-full text-muted-foreground hover:text-destructive @min-[46rem]:order-last"
        aria-label={`Eliminar etapa ${stage.name}`}
        onClick={() => onDelete(stage)}
      >
        <Trash2 className="size-4" />
      </Button>

      <div className="col-span-full flex flex-wrap items-center gap-x-4 gap-y-2 pl-[4.75rem] @min-[46rem]:col-span-1 @min-[46rem]:pl-0">
        <div className="flex h-9 items-center overflow-hidden rounded-xl border border-input bg-background">
          <button
            type="button"
            aria-label={`Bajar la probabilidad de ${stage.name}`}
            disabled={probabilityValue <= 0}
            onClick={() => step(-PROBABILITY_STEP)}
            className="grid size-9 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <Minus className="size-3.5" aria-hidden />
          </button>
          <label className="flex h-9 items-center text-sm font-medium tabular-nums">
            <span className="sr-only">Probabilidad de {stage.name}</span>
            <input
              inputMode="numeric"
              value={probability}
              onChange={(e) => setProbability(e.target.value)}
              onBlur={() => {
                const value = Number(probability);
                if (Number.isFinite(value) && value >= 0 && value <= 100) {
                  commitProbability(value);
                } else {
                  setProbability(String(stage.probability_pct));
                }
              }}
              aria-label={`Probabilidad de ${stage.name}`}
              className="w-9 bg-transparent text-right outline-none"
            />
            <span aria-hidden className="pr-1 pl-0.5 text-muted-foreground">%</span>
          </label>
          <button
            type="button"
            aria-label={`Subir la probabilidad de ${stage.name}`}
            disabled={probabilityValue >= 100}
            onClick={() => step(PROBABILITY_STEP)}
            className="grid size-9 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        </div>

        <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
          Se enfría a los
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
            className="h-9 w-14 rounded-xl text-right tabular-nums"
            aria-label={`Días de estancamiento de ${stage.name}`}
          />
          días
        </label>
      </div>
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
  /** El tablero del pipeline elegido: cuántas oportunidades abiertas tiene cada etapa (para el aviso de borrar). */
  const [board, setBoard] = useState<BoardDTO | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const selected = pipelines?.find((pipeline) => pipeline.id === selectedId) ?? null;

  const loadBoard = (pipelineId: string) => {
    getBoard(pipelineId)
      .then((fresh) => setBoard(fresh.pipeline_id === pipelineId ? fresh : null))
      .catch(() => setBoard(null));
  };

  useEffect(() => {
    setBoard(null);
    if (selectedId !== null) loadBoard(selectedId);
  }, [selectedId]);

  /** Las oportunidades abiertas de la etapa que se quiere borrar, si el tablero las sabe. */
  const stageLoad = useMemo(() => {
    if (stageDelete === null || board === null) return null;
    const column = board.columns.find((item) => item.stage.id === stageDelete.stage.id);
    if (column === undefined) return null;
    const currency = column.deals[0]?.currency ?? "COP";
    return { count: column.total_count, value: formatMillions(column.total_value_cents, currency) };
  }, [stageDelete, board]);

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
      showAlert({ tone: "error", title: errorMessage(err, "No se pudieron cargar los pipelines") });
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
      if (successTitle !== undefined) showAlert({ tone: "success", title: successTitle });
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo guardar") });
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
        showAlert({ tone: "error", title: errorMessage(err, "No se pudo reordenar") });
        void load();
      });
  };

  const handleDeleteStage = async (stage: PipelineStageDTO, moveTo?: string) => {
    if (selected === null) return;
    try {
      applyPipeline(await deleteStage(selected.id, stage.id, moveTo));
      loadBoard(selected.id);
      setStageDelete(null);
      setDeleteTarget(null);
      showAlert({ tone: "success", title: "Etapa eliminada" });
    } catch (err) {
      if (isHttpError(err) && err.is("crm/stage_in_use") && moveTo === undefined) {
        setStageDelete({ stage }); // pide destino
        return;
      }
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar la etapa") });
    }
  };

  const handleDeletePipeline = async (pipeline: PipelineDTO, moveTo?: string) => {
    try {
      await deletePipeline(pipeline.id, moveTo);
      setPipelineDelete(null);
      setDeleteTarget(null);
      closeModal();
      showAlert({ tone: "success", title: "Pipeline eliminado" });
      setSelectedId(null);
      void load();
    } catch (err) {
      closeModal();
      if (isHttpError(err) && err.is("crm/pipeline_in_use") && moveTo === undefined) {
        setPipelineDelete({ pipeline });
        return;
      }
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar el pipeline") });
    }
  };

  if (pipelines === null) return <TableSkeleton rows={5} showHeader={false} />;

  return (
    <div className="@container min-w-0">
      <div className="grid min-w-0 gap-4 @min-[52rem]:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Lista de pipelines */}
        <div className="min-w-0 space-y-2">
          <p className="px-1 text-xs text-muted-foreground">
            Pipelines · {pipelines.length}
          </p>
          <ul className="grid gap-2 @min-[34rem]:grid-cols-2 @min-[52rem]:grid-cols-1">
            {pipelines.map((pipeline) => (
              <li key={pipeline.id} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={pipeline.id === selectedId}
                  onClick={() => setSelectedId(pipeline.id)}
                  className={cn(
                    "flex w-full min-w-0 flex-col gap-1 rounded-2xl border bg-card px-4 py-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                    pipeline.id === selectedId
                      ? "border-foreground shadow-[0_0_0_1px_var(--foreground)]"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <span className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold" title={pipeline.name}>
                      {pipeline.name}
                    </span>
                    {pipeline.is_default && <StatePill tone="neutral">Predeterminado</StatePill>}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {pipeline.stages.length} {pipeline.stages.length === 1 ? "etapa" : "etapas"}
                  </span>
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
                  showAlert({ tone: "error", title: errorMessage(err, "No se pudo crear el pipeline") }),
                );
            }}
          >
            <Input
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              placeholder="Nuevo pipeline…"
              className="h-9 rounded-xl"
              aria-label="Nombre del nuevo pipeline"
            />
            <Button type="submit" size="icon" variant="outline" className="size-9 shrink-0 rounded-full" aria-label="Crear pipeline">
              <Plus className="size-4" />
            </Button>
          </form>
        </div>

        {/* Etapas del pipeline seleccionado */}
        {selected !== null && (
          <div className="min-w-0 space-y-4">
            <section className="@container min-w-0 overflow-hidden rounded-3xl border border-border bg-card">
              <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-4 pb-3 @min-[46rem]:px-5">
                <div className="min-w-0">
                  <h2 className="truncate font-heading text-lg font-bold" title={selected.name}>
                    Etapas de {selected.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">Arrastra para ordenar · se guarda al salir de cada campo</p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {!selected.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      onClick={() => void run(() => updatePipeline(selected.id, { is_default: true }), "Ahora es el pipeline predeterminado")}
                    >
                      <Star className="size-3.5" />
                      Hacer predeterminado
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
              </header>

              <DndContext sensors={sensors} onDragEnd={handleReorder}>
                <SortableContext
                  items={selected.stages.map((stage) => stage.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul>
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
                className="flex items-center gap-1.5 border-t border-border px-4 py-3 @min-[46rem]:px-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = newStageName.trim();
                  if (!name) return;
                  void run(
                    () => createStage(selected.id, { name, probability_pct: 50 }),
                    "Etapa añadida al final",
                  ).then(() => {
                    setNewStageName("");
                    loadBoard(selected.id);
                  });
                }}
              >
                <Input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="Nueva etapa…"
                  className="h-9 max-w-72 rounded-xl"
                  aria-label="Nombre de la nueva etapa"
                />
                <Button type="submit" size="sm" variant="outline" className="h-9 shrink-0 rounded-full">
                  <Plus className="size-3.5" />
                  Añadir etapa
                </Button>
              </form>
            </section>
          </div>
        )}
      </div>

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
            title: `Eliminar «${stageDelete.stage.name}»`,
            description:
              stageLoad !== null && stageLoad.count > 0
                ? `Tiene ${String(stageLoad.count)} ${stageLoad.count === 1 ? "oportunidad abierta" : "oportunidades abiertas"} por ${stageLoad.value}. No se borran: elige a qué etapa pasan.`
                : `Tiene oportunidades. No se borran: elige a qué etapa pasan antes de eliminar «${stageDelete.stage.name}».`,
            className: "sm:max-w-md",
            actions: [],
            showCloseButton: false,
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
            showCloseButton: false,
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
