"use client";

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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  MAX_FIELDS_PER_FORM,
  type EditableFormField,
  type FormFieldType,
  type RecommendedField,
} from "@/modules/forms/domain/form";
import { AddFieldCatalog } from "./AddFieldCatalog";
import { FieldTypeIcon } from "./FieldTypeIcon";

/**
 * Lista maestra: el orden en que el agente pide los datos. Es un resumen NO
 * editable (toda la edición vive en el panel de detalle) para que haya un solo
 * lugar donde está la verdad.
 *
 * Es un `<ol>` porque el orden ES semántico: es la secuencia de la
 * conversación. La `position` que viaja al backend se deriva del índice, así
 * que reordenar es solo mover en el array.
 */
export function FieldMasterList({
  fields,
  selectedKey,
  invalidKeys,
  readOnly,
  onSelect,
  onMove,
  onAdd,
}: {
  fields: EditableFormField[];
  selectedKey: string | null;
  /** Keys con error de validación, para marcarlas en la lista. */
  invalidKeys: ReadonlySet<string>;
  readOnly: boolean;
  onSelect: (key: string) => void;
  onMove: (from: number, to: number) => void;
  onAdd: (preset?: RecommendedField) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const nameOf = (key: string) => {
    const field = fields.find((candidate) => candidate.key === key);
    const label = field?.label.trim();
    return label !== undefined && label !== "" ? label : "el dato sin nombre";
  };
  const indexOf = (key: string) => fields.findIndex((field) => field.key === key);

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over === null || event.active.id === event.over.id) return;
    onMove(indexOf(String(event.active.id)), indexOf(String(event.over.id)));
  };

  const requiredCount = fields.filter((field) => field.required).length;
  const atCapacity = fields.length >= MAX_FIELDS_PER_FORM;

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-background p-2">
      <div className="flex items-baseline justify-between gap-2 px-2 pt-1">
        <h2 className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Orden en que pregunta
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {fields.length}/{MAX_FIELDS_PER_FORM}
        </span>
      </div>

      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Pulsa espacio para mover este dato. Usa las flechas arriba y abajo para cambiar su posición, espacio para confirmar y Escape para cancelar.",
          },
          announcements: {
            onDragStart: ({ active }) => `Moviendo ${nameOf(String(active.id))}.`,
            onDragOver: ({ active, over }) =>
              over ? `${nameOf(String(active.id))} sobre la posición ${indexOf(String(over.id)) + 1}.` : "",
            onDragEnd: ({ active, over }) =>
              over
                ? `${nameOf(String(active.id))} quedó en la posición ${indexOf(String(over.id)) + 1}.`
                : "Movimiento cancelado.",
            onDragCancel: ({ active }) =>
              `Movimiento cancelado, ${nameOf(String(active.id))} volvió a su posición.`,
          },
        }}
      >
        <SortableContext items={fields.map((field) => field.key)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-1">
            {fields.map((field, index) => (
              <FieldRow
                key={field.key}
                field={field}
                index={index}
                total={fields.length}
                selected={field.key === selectedKey}
                invalid={invalidKeys.has(field.key)}
                readOnly={readOnly}
                onSelect={() => onSelect(field.key)}
                onMove={onMove}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {!readOnly && (
        <AddFieldCatalog
          usedCodes={new Set(fields.map((field) => field.code))}
          disabled={atCapacity}
          onPick={onAdd}
        />
      )}

      <p className="px-2 pb-1 text-xs text-muted-foreground">
        {atCapacity
          ? `Llegaste al máximo de ${MAX_FIELDS_PER_FORM} datos por flujo.`
          : requiredCount === 0
            ? "Ninguno es obligatorio"
            : `${requiredCount} de ${fields.length} ${requiredCount === 1 ? "es obligatorio" : "son obligatorios"}`}
      </p>
    </div>
  );
}

function FieldRow({
  field,
  index,
  total,
  selected,
  invalid,
  readOnly,
  onSelect,
  onMove,
}: {
  field: EditableFormField;
  index: number;
  total: number;
  selected: boolean;
  invalid: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.key,
  });

  const label = field.label.trim() === "" ? "Dato sin nombre" : field.label;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex min-h-11 items-center gap-1.5 rounded-xl border px-1.5 py-1.5 transition-colors",
        selected ? "border-primary/40 bg-accent" : "border-transparent hover:bg-accent/50",
        invalid && !selected && "border-destructive/40",
        isDragging && "z-10 opacity-70 shadow-float",
      )}
    >
      {/* El grip es el ÚNICO activador del drag: así el clic en la fila sigue seleccionando. */}
      {!readOnly && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar ${label}`}
          className="size-9 shrink-0 cursor-grab touch-none rounded-md text-muted-foreground hover:text-foreground active:cursor-grabbing lg:size-7"
        >
          <GripVertical className="mx-auto size-4" aria-hidden />
        </button>
      )}

      <button
        type="button"
        aria-current={selected ? "true" : undefined}
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left"
      >
        <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {index + 1}
        </span>
        <FieldTypeIcon type={field.type as FormFieldType} />
        <span className={cn("min-w-0 flex-1 truncate text-sm", selected && "font-medium")}>{label}</span>
        {field.required ? (
          <Badge variant="secondary" className="shrink-0 text-[11px] font-medium">
            Obligatorio
          </Badge>
        ) : (
          <span className="shrink-0 text-[11px] text-muted-foreground">Opcional</span>
        )}
      </button>

      {!readOnly && (
        <span className="flex shrink-0 items-center opacity-100 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 lg:size-7"
            disabled={index === 0}
            aria-label={`Subir ${label}`}
            onClick={() => onMove(index, index - 1)}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 lg:size-7"
            disabled={index === total - 1}
            aria-label={`Bajar ${label}`}
            onClick={() => onMove(index, index + 1)}
          >
            <ArrowDown className="size-3.5" />
          </Button>
        </span>
      )}
    </li>
  );
}

export { arrayMove };
