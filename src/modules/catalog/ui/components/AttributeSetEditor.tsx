"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { Island } from "@/shared/components/features/island";
import { errorMessage } from "@/core/lib/error-messages";
import {
  ATTRIBUTE_SCOPE_LABELS,
  ATTRIBUTE_TYPE_LABELS,
  SELECTABLE_ATTRIBUTE_TYPES,
  MAX_ATTRIBUTES_PER_TYPE,
  attributeOptions,
  type AttributeDefinitionDTO,
  type AttributeScope,
  type AttributeType,
  type ProductTypeDTO,
} from "@/modules/catalog/domain/product-type";
import { setProductTypeAttributes } from "@/modules/catalog/infrastructure/services/product-type-service.adapter";
import { AttributeOptionsInput } from "./AttributeOptionsInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { AppAlert } from "@/core/notifications";

/** Fila editable del set (la posición es el índice del array). */
type EditableAttribute = AttributeDefinitionDTO & {
  /** true si el atributo ya existía en el backend (su `code` no se cambia). */
  persisted: boolean;
  /** Clave estable de render para filas nuevas. */
  key: string;
};

function fromDto(productType: ProductTypeDTO): EditableAttribute[] {
  return [...productType.attributes]
    .sort((a, b) => a.position - b.position)
    .map((attribute) => ({
      code: attribute.code,
      label: attribute.label,
      type: attribute.type,
      scope: attribute.scope,
      is_required: attribute.is_required,
      options: attributeOptions(attribute),
      ...(attribute.unit ? { unit: attribute.unit } : {}),
      persisted: true,
      key: attribute.id,
    }));
}

/** Lo que se guarda de una fila (sin la clave de render): para saber si hay cambios. */
function signature(rows: EditableAttribute[]): string {
  return JSON.stringify(
    rows.map(({ code, label, type, scope, is_required, options, unit }) => [
      code,
      label,
      type,
      scope,
      is_required,
      type === "select" ? (options ?? []) : [],
      unit?.trim() || null,
    ]),
  );
}

function validate(rows: EditableAttribute[]): string | null {
  const codes = new Set<string>();
  for (const row of rows) {
    if (!row.code.trim()) return "Todos los atributos necesitan un código";
    if (!/^[a-z0-9_]+$/.test(row.code)) {
      return `El código “${row.code}” debe ir en minúsculas snake_case (a-z, 0-9, _)`;
    }
    if (codes.has(row.code)) return `El código “${row.code}” está repetido`;
    codes.add(row.code);
    if (!row.label.trim()) return `El atributo “${row.code}” necesita una etiqueta`;
    if (row.type === "select" && (row.options?.length ?? 0) === 0) {
      return `El atributo “${row.label}” es de selección y necesita al menos una opción`;
    }
  }
  return null;
}

/**
 * Editor del attribute set de un tipo de producto. Estado local; guardar
 * envía el conjunto COMPLETO (`PUT /:id/attributes`, replace-set). Si se
 * eliminaron atributos existentes se confirma antes (borra sus valores).
 */
export function AttributeSetEditor({
  productType,
  onSaved,
  setAlert,
  readOnly,
  onDirtyChange,
}: {
  productType: ProductTypeDTO;
  onSaved?: (updated: ProductTypeDTO) => void | Promise<void>;
  setAlert?: (alert: AppAlert) => void;
  readOnly?: boolean;
  /** Catálogo premium F4: la vista avisa antes de salir con atributos sin guardar. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [rows, setRows] = useState<EditableAttribute[]>(() => fromDto(productType));
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Sucio = distinto de lo guardado. Antes nada avisaba y la barra no existía.
  const saved = useMemo(() => signature(fromDto(productType)), [productType]);
  const dirty = signature(rows) !== saved;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  const discard = () => setRows(fromDto(productType));
  const newCount = rows.filter((row) => !row.persisted).length;

  const persistedCodes = useMemo(
    () => new Set(productType.attributes.map((attribute) => attribute.code)),
    [productType.attributes],
  );
  const removedCodes = useMemo(
    () => [...persistedCodes].filter((code) => !rows.some((row) => row.code === code)),
    [persistedCodes, rows],
  );

  const patchRow = (index: number, patch: Partial<EditableAttribute>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const moveRow = (index: number, delta: number) => {
    setRows((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        code: "",
        label: "",
        type: "text",
        scope: "product",
        is_required: false,
        options: [],
        persisted: false,
        key: `new-${prev.length}-${prev.reduce((acc, row) => acc + row.key.length, 0)}`,
      },
    ]);
  };

  const save = async () => {
    const problem = validate(rows);
    if (problem) {
      setAlert?.({ tone: "error", title: problem });
      return;
    }
    try {
      setSaving(true);
      const updated = await setProductTypeAttributes(productType.id, {
        attributes: rows.map((row) => ({
          code: row.code,
          label: row.label.trim(),
          type: row.type,
          scope: row.scope,
          is_required: row.is_required,
          ...(row.type === "select" ? { options: row.options ?? [] } : {}),
          ...(row.unit?.trim() ? { unit: row.unit.trim() } : {}),
        })),
      });
      setRows(fromDto(updated));
      setAlert?.({ tone: "success", title: "Atributos guardados correctamente" });
      await onSaved?.(updated);
    } catch (err) {
      setAlert?.({ tone: "error", title: errorMessage(err, "No se pudieron guardar los atributos") });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const handleSaveClick = () => {
    if (removedCodes.length > 0) {
      setConfirmOpen(true);
      return;
    }
    void save();
  };

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-5" aria-label="Atributos del tipo de producto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">
            Atributos{" "}
            <span className="font-normal text-muted-foreground tabular-nums">
              ({rows.length}/{MAX_ATTRIBUTES_PER_TYPE})
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Ámbito «Producto» describe la ficha; «Variante» define ejes de variación (color, talla…).
          </p>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={addRow}
              disabled={rows.length >= MAX_ATTRIBUTES_PER_TYPE}
              title={rows.length >= MAX_ATTRIBUTES_PER_TYPE ? `Llegaste al máximo de ${MAX_ATTRIBUTES_PER_TYPE} atributos` : undefined}
            >
              <Plus className="h-4 w-4" />
              Añadir atributo
            </Button>

          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Sin atributos. Añade el primero para tipar los productos de este tipo.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, index) => (
            <li key={row.key} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label={`Subir ${row.label || row.code || "atributo"}`}
                    disabled={readOnly || index === 0}
                    onClick={() => moveRow(index, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label={`Bajar ${row.label || row.code || "atributo"}`}
                    disabled={readOnly || index === rows.length - 1}
                    onClick={() => moveRow(index, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor={`attr-code-${row.key}`}>Código</Label>
                    <Input
                      id={`attr-code-${row.key}`}
                      value={row.code}
                      disabled={readOnly || row.persisted}
                      maxLength={40}
                      placeholder="material"
                      className="font-mono"
                      onChange={(e) => patchRow(index, { code: e.target.value.toLowerCase() })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`attr-label-${row.key}`}>Etiqueta</Label>
                    <Input
                      id={`attr-label-${row.key}`}
                      value={row.label}
                      disabled={readOnly}
                      maxLength={120}
                      placeholder="Material"
                      onChange={(e) => patchRow(index, { label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`attr-type-${row.key}`}>Tipo</Label>
                    <Select
                      value={row.type}
                      onValueChange={(v: string) => patchRow(index, { type: v as AttributeType })}
                    >
                      <SelectTrigger id={`attr-type-${row.key}`} className="w-full" disabled={readOnly}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SELECTABLE_ATTRIBUTE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {ATTRIBUTE_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`attr-scope-${row.key}`}>Ámbito</Label>
                    <Select
                      value={row.scope}
                      onValueChange={(v: string) => patchRow(index, { scope: v as AttributeScope })}
                    >
                      <SelectTrigger id={`attr-scope-${row.key}`} className="w-full" disabled={readOnly}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ATTRIBUTE_SCOPE_LABELS) as AttributeScope[]).map((scope) => (
                          <SelectItem key={scope} value={scope}>
                            {ATTRIBUTE_SCOPE_LABELS[scope]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {row.type === "number" && (
                    <div className="space-y-1.5">
                      <Label htmlFor={`attr-unit-${row.key}`}>Unidad</Label>
                      <Input
                        id={`attr-unit-${row.key}`}
                        value={row.unit ?? ""}
                        disabled={readOnly}
                        maxLength={20}
                        placeholder="g, cm, ml…"
                        onChange={(e) => patchRow(index, { unit: e.target.value })}
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 pt-6 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={row.is_required}
                      disabled={readOnly}
                      onChange={(e) => patchRow(index, { is_required: e.target.checked })}
                    />
                    Requerido
                  </label>

                  {row.type === "select" && (
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                      <Label>Opciones</Label>
                      <AttributeOptionsInput
                        value={row.options ?? []}
                        disabled={readOnly}
                        onChange={(options) => patchRow(index, { options })}
                      />
                    </div>
                  )}
                </div>

                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6 h-8 w-8 text-destructive hover:text-destructive"
                    aria-label={`Eliminar ${row.label || row.code || "atributo"}`}
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && dirty ? (
        // La barra de acción en tinta, pegada abajo (DS §9.5.1): aparece con cambios y dice cuáles.
        <Island
          as="footer"
          material="ink"
          glow="none"
          className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-3xl py-2.5 pr-2.5 pl-5 sm:rounded-full"
        >
          <p className="min-w-0 basis-full text-sm sm:flex-1 sm:basis-auto">
            <span className="font-semibold">
              {newCount > 0
                ? `${newCount} ${newCount === 1 ? "atributo nuevo" : "atributos nuevos"}`
                : removedCodes.length > 0
                  ? `${removedCodes.length} ${removedCodes.length === 1 ? "atributo quitado" : "atributos quitados"}`
                  : "Cambios sin guardar"}
            </span>
            <span className="hidden text-muted-foreground xl:inline"> · nada se guarda hasta que guardes</span>
          </p>
          <Button type="button" variant="ghost" className="ml-auto rounded-full sm:ml-0" onClick={discard} disabled={saving}>
            Descartar
          </Button>
          <Button type="button" variant="contrast" className="rounded-full px-5" onClick={handleSaveClick} disabled={saving}>
            {saving ? "Guardando…" : "Guardar atributos"}
          </Button>
        </Island>
      ) : null}

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        config={{
          title: "Eliminar atributos existentes",
          description: `Se eliminarán: ${removedCodes.join(", ")}.`,
          actions: [
            { label: "Cancelar", variant: "outline", id: "attrs-cancel" },
            {
              label: saving ? "Guardando…" : "Eliminar y guardar",
              variant: "destructive",
              keepOpen: true,
              onClick: () => void save(),
              id: "attrs-confirm",
            },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          Los valores que los productos tengan en esos atributos se borrarán de forma permanente.
        </div>
      </Modal>
    </section>
  );
}
