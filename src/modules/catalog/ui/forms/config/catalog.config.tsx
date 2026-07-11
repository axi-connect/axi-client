"use client";

import { z } from "zod";
import type { CreateCatalogDTO, UpdateCatalogDTO } from "@/modules/catalog/domain/catalog";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import { createInputField } from "@/shared/components/features/dynamic-form";

/**
 * Config del formulario de catálogo (create/edit). El `code` es único por
 * tenant y viaja en minúsculas (`^[a-z0-9_-]+$`, igual que el backend).
 */
export const catalogFormSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(120, "Máximo 120 caracteres"),
  code: z
    .string()
    .trim()
    .min(1, "Código requerido")
    .max(40, "Máximo 40 caracteres")
    .regex(/^[a-z0-9_-]+$/, "Solo minúsculas, números, guion y guion bajo"),
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});

export type CatalogFormValues = z.infer<typeof catalogFormSchema>;

export const defaultCatalogFormValues: CatalogFormValues = {
  name: "",
  code: "",
  description: "",
};

export function buildCatalogFormFields(): ReadonlyArray<FieldConfig<CatalogFormValues>> {
  return [
    createInputField<CatalogFormValues>("name", {
      label: "Nombre",
      placeholder: "Catálogo principal",
      inputProps: { autoFocus: true, maxLength: 120 },
    }),
    createInputField<CatalogFormValues>("code", {
      label: "Código",
      placeholder: "principal",
      description: "Identificador único, en minúsculas (p. ej. temporada-2026)",
      inputProps: { maxLength: 40, className: "font-mono" },
    }),
    createInputField<CatalogFormValues>("description", {
      label: "Descripción",
      inputKind: "textarea",
      placeholder: "Qué agrupa este catálogo (opcional)",
      colSpan: { base: 1, md: 2 },
      inputProps: { maxLength: 500 },
    }),
  ];
}

export function toCreateCatalogDTO(values: CatalogFormValues): CreateCatalogDTO {
  return {
    name: values.name,
    code: values.code,
    ...(values.description ? { description: values.description } : {}),
  };
}

export function toUpdateCatalogDTO(values: CatalogFormValues): UpdateCatalogDTO {
  return {
    name: values.name,
    code: values.code,
    description: values.description || null,
  };
}
