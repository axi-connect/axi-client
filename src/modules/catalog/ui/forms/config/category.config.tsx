"use client";

import { z } from "zod";
import type { CreateCategoryDTO, UpdateCategoryDTO } from "@/modules/catalog/domain/category";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import { createCustomField, createInputField } from "@/shared/components/features/dynamic-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/** Sentinel del select de padre: las categorías raíz no tienen `parent_id`. */
export const ROOT_PARENT_VALUE = "__root__";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(120, "Máximo 120 caracteres"),
  parent_id: z.string().optional(),
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
  position: z.coerce.number().int("Debe ser un entero").min(0, "Debe ser ≥ 0").optional(),
  is_active: z.enum(["active", "inactive"]).optional(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const defaultCategoryFormValues: CategoryFormValues = {
  name: "",
  parent_id: ROOT_PARENT_VALUE,
  description: "",
  position: 0,
  is_active: undefined,
};

export type ParentOption = { id: string; label: string; depth: number };

export function buildCategoryFormFields(opts: {
  parents: ParentOption[];
  isEdit: boolean;
}): ReadonlyArray<FieldConfig<CategoryFormValues>> {
  const { parents, isEdit } = opts;

  const fields: FieldConfig<CategoryFormValues>[] = [
    createInputField<CategoryFormValues>("name", {
      label: "Nombre",
      placeholder: "Camisetas",
      inputProps: { autoFocus: true, maxLength: 120 },
    }),
    createCustomField<CategoryFormValues>(
      "parent_id",
      ({ value, setValue }) => (
        <Select
          name="parent_id"
          value={String(value ?? ROOT_PARENT_VALUE)}
          onValueChange={(v: string) => setValue("parent_id", v)}
        >
          <SelectTrigger id="df-parent_id" className="w-full">
            <SelectValue placeholder="Categoría raíz" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ROOT_PARENT_VALUE}>Sin padre (raíz)</SelectItem>
            {parents.map((parent) => (
              <SelectItem key={parent.id} value={parent.id}>
                {`${"— ".repeat(parent.depth)}${parent.label}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      { label: "Categoría padre", htmlFor: "df-parent_id" },
    ),
    createInputField<CategoryFormValues>("description", {
      label: "Descripción",
      inputKind: "textarea",
      placeholder: "Qué agrupa esta categoría (opcional)",
      colSpan: { base: 1, md: 2 },
      inputProps: { maxLength: 500 },
    }),
    createInputField<CategoryFormValues>("position", {
      label: "Posición",
      inputKind: "number",
      description: "Orden entre hermanas (menor = primero)",
      inputProps: { min: 0, step: 1 },
    }),
  ];

  if (isEdit) {
    fields.push(
      createCustomField<CategoryFormValues>(
        "is_active",
        ({ value, setValue }) => (
          <Select
            name="is_active"
            value={String(value ?? "active")}
            onValueChange={(v: string) => setValue("is_active", v as "active" | "inactive")}
          >
            <SelectTrigger id="df-is_active" className="w-full">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activa</SelectItem>
              <SelectItem value="inactive">Inactiva</SelectItem>
            </SelectContent>
          </Select>
        ),
        { label: "Estado", htmlFor: "df-is_active" },
      ),
    );
  }

  return fields;
}

export function toCreateCategoryDTO(values: CategoryFormValues): CreateCategoryDTO {
  const parentId = values.parent_id && values.parent_id !== ROOT_PARENT_VALUE ? values.parent_id : undefined;
  return {
    name: values.name,
    ...(parentId ? { parent_id: parentId } : {}),
    ...(values.description ? { description: values.description } : {}),
    ...(values.position !== undefined ? { position: values.position } : {}),
  };
}

export function toUpdateCategoryDTO(values: CategoryFormValues): UpdateCategoryDTO {
  return {
    name: values.name,
    parent_id: values.parent_id && values.parent_id !== ROOT_PARENT_VALUE ? values.parent_id : null,
    description: values.description || null,
    ...(values.position !== undefined ? { position: values.position } : {}),
    ...(values.is_active ? { is_active: values.is_active === "active" } : {}),
  };
}
