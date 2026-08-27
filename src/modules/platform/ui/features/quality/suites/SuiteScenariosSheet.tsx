"use client";

/**
 * Composición de una suite: buscador de escenarios ACTIVOS + lista ordenada
 * (el índice del array = `position`). Guardar hace PUT de REEMPLAZO TOTAL
 * (1–50 ids, sin duplicados — garantizado por los helpers puros). Las suites
 * de sistema y los escenarios archivados se muestran en solo lectura: los
 * archivados NO se ejecutan (cases_total puede ser menor que scenarios_count).
 *
 * La lista es un `<ol>` sortable porque el orden ES semántico (la secuencia de
 * ejecución), igual que la lista maestra de `modules/forms` — de ahí salen el
 * grip + flechas y los anuncios de lector de pantalla.
 *
 * Regla de layout que costó un bug: el código y el nombre van en elementos de
 * BLOQUE dentro de un `min-w-0 overflow-hidden`. Con `<span>` inline el
 * `truncate` es inerte (`text-overflow` solo aplica a contenedores de bloque) y
 * el nombre se pintaba encima de los botones ↑ ↓ ✕ y del botón «Añadir».
 */
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Check, GripVertical, Plus, SearchX, TriangleAlert, X } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { MAX_SUITE_SCENARIOS, type SuiteListItem } from "../../../../domain/quality";
import { useScenariosQuery } from "../../../../infrastructure/api/hooks/use-quality-scenarios";
import {
  useSetSuiteScenarios,
  useSuiteQuery,
} from "../../../../infrastructure/api/hooks/use-quality-suites";
import { ProblemAlert } from "../../../components/ProblemAlert";
import { StatusBadge } from "../../../components/StatusBadge";
import {
  addSuiteScenario,
  removeSuiteScenario,
  reorderSuiteScenario,
  type SuiteScenarioItem,
} from "./suite-scenarios.helpers";

/** Resultados por página del picker; el resto se alcanza buscando. */
const PICKER_PAGE_SIZE = 10;

type SuiteScenariosSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Suite cuya composición se gestiona (null = cerrado). */
  suite: SuiteListItem | null;
  /** Suites de sistema: composición visible pero inmutable. */
  readOnly?: boolean;
};

export function SuiteScenariosSheet({ open, onOpenChange, suite, readOnly = false }: SuiteScenariosSheetProps) {
  const { showAlert, showModal, closeModal } = useAlert();
  const detailQuery = useSuiteQuery(open && suite ? suite.id : null);
  const setScenarios = useSetSuiteScenarios();

  const [items, setItems] = useState<SuiteScenarioItem[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDraft), 350);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  // Hidrata la lista local UNA vez por apertura (no pisar cambios del usuario).
  useEffect(() => {
    if (open && items === null && detailQuery.data) {
      setItems(
        detailQuery.data.scenarios.map(({ scenario }) => ({
          id: scenario.id,
          code: scenario.code,
          name: scenario.name,
          status: scenario.status,
        })),
      );
    }
  }, [open, items, detailQuery.data]);

  useEffect(() => {
    if (!open) {
      setItems(null);
      setDirty(false);
      setSearchDraft("");
      setSearch("");
    }
  }, [open]);

  const pickerQuery = useScenariosQuery(
    { status: "active", search, page: 1, pageSize: PICKER_PAGE_SIZE },
    { enabled: open && !readOnly },
  );

  function apply(next: SuiteScenarioItem[]) {
    setItems(next);
    setDirty(true);
  }

  /**
   * Único camino de cierre. Esc, clic en el overlay, la ✕ del header y
   * «Cancelar» pasan todos por aquí, así que la guarda de cambios sin guardar
   * cubre los cuatro con una sola confirmación.
   */
  function handleOpenChange(next: boolean) {
    if (next || !dirty || setScenarios.isPending) {
      onOpenChange(next);
      return;
    }
    showModal({
      title: "¿Descartar los cambios?",
      description: "La composición volverá a como estaba guardada.",
      className: "sm:max-w-md",
      actions: [
        { label: "Seguir editando", variant: "outline", asClose: true, id: "suite-scenarios-discard-cancel" },
        {
          label: "Descartar",
          variant: "outline",
          asClose: false,
          id: "suite-scenarios-discard-confirm",
          onClick: () => {
            closeModal();
            onOpenChange(false);
          },
        },
      ],
    });
  }

  async function save() {
    if (!suite || !items) return;
    try {
      await setScenarios.mutateAsync({ id: suite.id, scenarioIds: items.map((item) => item.id) });
      showAlert({
        tone: "success",
        title: "Composición guardada",
        description: `${suite.name} quedó con ${items.length} ${items.length === 1 ? "escenario" : "escenarios"}.`,
        autoCloseMs: 5000,
      });
      onOpenChange(false);
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo guardar", description: errorMessage(error) });
    }
  }

  const list = items ?? [];
  const archivedCount = list.filter((item) => item.status === "archived").length;
  const full = list.length >= MAX_SUITE_SCENARIOS;
  const canSave = !readOnly && dirty && list.length >= 1 && list.length <= MAX_SUITE_SCENARIOS;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const indexOf = (id: string) => list.findIndex((item) => item.id === id);
  const codeOf = (id: string) => list.find((item) => item.id === id)?.code ?? "el escenario";

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over === null || event.active.id === event.over.id) return;
    apply(reorderSuiteScenario(list, indexOf(String(event.active.id)), indexOf(String(event.over.id))));
  };

  const pickerTotal = pickerQuery.data?.meta.total ?? 0;
  const pickerRows = pickerQuery.data?.data ?? [];

  return (
    <DetailSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={`Escenarios de la suite · ${suite?.name ?? ""}`}
      subtitle={
        readOnly
          ? "Suite de fábrica: composición de solo lectura."
          : `El orden define la posición de ejecución (1–${MAX_SUITE_SCENARIOS}, sin duplicados).`
      }
      size="xl"
      renderFooter={
        readOnly || detailQuery.isPending || detailQuery.isError
          ? undefined
          : () => (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {saveHint({ count: list.length, dirty })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => handleOpenChange(false)}
                    disabled={setScenarios.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={() => void save()} disabled={!canSave || setScenarios.isPending}>
                    {setScenarios.isPending ? "Guardando…" : "Guardar composición"}
                  </Button>
                </div>
              </div>
            )
      }
    >
      <div className="space-y-5">
        {detailQuery.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : detailQuery.isError ? (
          <ProblemAlert error={detailQuery.error} onRetry={() => void detailQuery.refetch()} />
        ) : (
          <>
            {archivedCount > 0 && (
              <Alert variant="warning">
                <TriangleAlert aria-hidden="true" />
                <AlertDescription>
                  {archivedCount === 1
                    ? "1 escenario archivado no se ejecutará."
                    : `${archivedCount} escenarios archivados no se ejecutarán.`}{" "}
                  La ejecución de esta suite tendrá menos casos que escenarios listados.
                </AlertDescription>
              </Alert>
            )}

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                Composición{" "}
                <span className="text-muted-foreground tabular-nums">
                  ({list.length}/{MAX_SUITE_SCENARIOS})
                </span>
              </h3>
              {list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  La suite está vacía. Añade al menos un escenario para poder guardar.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  onDragEnd={handleDragEnd}
                  accessibility={{
                    screenReaderInstructions: {
                      draggable:
                        "Pulsa espacio para mover este escenario. Usa las flechas arriba y abajo para cambiar su posición, espacio para confirmar y Escape para cancelar.",
                    },
                    announcements: {
                      onDragStart: ({ active }) => `Moviendo ${codeOf(String(active.id))}.`,
                      onDragOver: ({ active, over }) =>
                        over ? `${codeOf(String(active.id))} sobre la posición ${indexOf(String(over.id)) + 1}.` : "",
                      onDragEnd: ({ active, over }) =>
                        over
                          ? `${codeOf(String(active.id))} quedó en la posición ${indexOf(String(over.id)) + 1}.`
                          : "Movimiento cancelado.",
                      onDragCancel: ({ active }) =>
                        `Movimiento cancelado, ${codeOf(String(active.id))} volvió a su posición.`,
                    },
                  }}
                >
                  <SortableContext items={list.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                    <ol className="space-y-1.5" aria-label="Escenarios en orden de ejecución">
                      {list.map((item, index) => (
                        <ScenarioRow
                          key={item.id}
                          item={item}
                          index={index}
                          total={list.length}
                          readOnly={readOnly}
                          onMove={(from, to) => apply(reorderSuiteScenario(list, from, to))}
                          onRemove={() => apply(removeSuiteScenario(list, index))}
                        />
                      ))}
                    </ol>
                  </SortableContext>
                </DndContext>
              )}
            </section>

            {!readOnly && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Añadir escenarios</h3>

                {full && (
                  <Alert variant="warning">
                    <TriangleAlert aria-hidden="true" />
                    <AlertDescription>
                      Llegaste al tope de {MAX_SUITE_SCENARIOS} escenarios por suite. Quita uno para poder
                      añadir otro.
                    </AlertDescription>
                  </Alert>
                )}

                <Input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Buscar escenarios activos…"
                  aria-label="Buscar escenarios para añadir"
                />

                {pickerQuery.isPending ? (
                  <Skeleton className="h-24 w-full rounded-xl" />
                ) : pickerRows.length === 0 ? (
                  <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-border p-4">
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <SearchX aria-hidden="true" className="size-4 shrink-0" />
                      Ningún escenario activo coincide.
                    </p>
                    {searchDraft !== "" && (
                      <Button variant="outline" size="sm" onClick={() => setSearchDraft("")}>
                        Limpiar búsqueda
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                      {pickerRows.map((scenario) => {
                        const included = list.some((item) => item.id === scenario.id);
                        return (
                          <li key={scenario.id} className="flex items-center gap-2 bg-background px-3 py-2">
                            <ScenarioIdentity code={scenario.code} name={scenario.name} />
                            {included ? (
                              <span className="flex shrink-0 items-center gap-1.5 pr-1 text-xs text-muted-foreground">
                                <Check aria-hidden="true" className="size-4" />
                                En la suite
                              </span>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                                disabled={full}
                                aria-label={`Añadir ${scenario.code}`}
                                onClick={() =>
                                  apply(
                                    addSuiteScenario(list, {
                                      id: scenario.id,
                                      code: scenario.code,
                                      name: scenario.name,
                                      status: scenario.status,
                                    }),
                                  )
                                }
                              >
                                <Plus aria-hidden="true" />
                                <span className="sr-only sm:not-sr-only">Añadir</span>
                              </Button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {pickerTotal > pickerRows.length && (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        Mostrando {pickerRows.length} de {pickerTotal}. Refina la búsqueda para ver el resto.
                      </p>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </DetailSheet>
  );
}

/**
 * Qué falta para poder guardar — el botón nunca queda deshabilitado sin
 * explicación. El tope de 50 NO va aquí: con 50 escenarios se guarda igual, lo
 * que no se puede es añadir más (eso lo dice el aviso del picker).
 */
function saveHint({ count, dirty }: { count: number; dirty: boolean }) {
  if (count === 0) return "Añade al menos un escenario para poder guardar.";
  if (!dirty) return `${count} de ${MAX_SUITE_SCENARIOS} · sin cambios`;
  return `${count} de ${MAX_SUITE_SCENARIOS} · cambios sin guardar`;
}

/**
 * Código + nombre en DOS elementos de bloque dentro de una caja `min-w-0`
 * `overflow-hidden`: es lo que hace que `truncate` recorte de verdad y que el
 * texto no pueda pintarse sobre las acciones de la fila.
 */
function ScenarioIdentity({ code, name }: { code: string; name: string }) {
  return (
    <div className="min-w-0 flex-1 overflow-hidden">
      <p className="truncate font-mono text-xs">{code}</p>
      <p className="truncate text-sm text-muted-foreground" title={name}>
        {name}
      </p>
    </div>
  );
}

function ScenarioRow({
  item,
  index,
  total,
  readOnly,
  onMove,
  onRemove,
}: {
  item: SuiteScenarioItem;
  index: number;
  total: number;
  readOnly: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);

  /**
   * Al llegar al borde, el botón usado se deshabilita y el foco se perdería:
   * se pasa al opuesto para poder seguir moviendo sin volver al ratón.
   */
  const move = (to: number) => {
    onMove(index, to);
    if (to === 0) downRef.current?.focus();
    else if (to === total - 1) upRef.current?.focus();
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-1 rounded-xl border border-border bg-background px-2 py-1.5",
        isDragging && "z-10 opacity-70 shadow-float",
      )}
    >
      {!readOnly && (
        // El grip es el ÚNICO activador del arrastre: así el resto de la fila
        // sigue siendo texto seleccionable y las flechas siguen clicables.
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar ${item.code}`}
          className="size-9 shrink-0 cursor-grab touch-none rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing lg:size-7"
        >
          <GripVertical aria-hidden="true" className="mx-auto size-4" />
        </button>
      )}

      <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
        {index + 1}
      </span>

      <ScenarioIdentity code={item.code} name={item.name} />

      {item.status === "archived" && <StatusBadge status="archived" className="shrink-0" />}

      {!readOnly && (
        <div className="flex shrink-0 items-center">
          <Button
            ref={upRef}
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 lg:size-7"
            disabled={index === 0}
            aria-label={`Subir ${item.code}`}
            onClick={() => move(index - 1)}
          >
            <ArrowUp aria-hidden="true" className="size-4" />
          </Button>
          <Button
            ref={downRef}
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 lg:size-7"
            disabled={index === total - 1}
            aria-label={`Bajar ${item.code}`}
            onClick={() => move(index + 1)}
          >
            <ArrowDown aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 hover:text-destructive lg:size-7"
            aria-label={`Quitar ${item.code} de la suite`}
            onClick={onRemove}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      )}
    </li>
  );
}
