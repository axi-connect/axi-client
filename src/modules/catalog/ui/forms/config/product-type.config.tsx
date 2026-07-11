"use client";

import { z } from "zod";
import type { CreateProductTypeDTO, UpdateProductTypeDTO } from "@/modules/catalog/domain/product-type";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import { createInputField } from "@/shared/components/features/dynamic-form";

export const productTypeFormSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(120, "Máximo 120 caracteres"),
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});

export type ProductTypeFormValues = z.infer<typeof productTypeFormSchema>;

export const defaultProductTypeFormValues: ProductTypeFormValues = {
  name: "",
  description: "",
};

export function buildProductTypeFormFields(): ReadonlyArray<FieldConfig<ProductTypeFormValues>> {
  return [
    createInputField<ProductTypeFormValues>("name", {
      label: "Nombre",
      placeholder: "Ropa",
      description: "Único por empresa (p. ej. Ropa, Calzado, Servicios de spa)",
      inputProps: { autoFocus: true, maxLength: 120 },
    }),
    createInputField<ProductTypeFormValues>("description", {
      label: "Descripción",
      inputKind: "textarea",
      placeholder: "Qué clase de productos usa este tipo (opcional)",
      inputProps: { maxLength: 500 },
    }),
  ];
}

export function toCreateProductTypeDTO(values: ProductTypeFormValues): CreateProductTypeDTO {
  return {
    name: values.name,
    ...(values.description ? { description: values.description } : {}),
  };
}

export function toUpdateProductTypeDTO(values: ProductTypeFormValues): UpdateProductTypeDTO {
  return {
    name: values.name,
    description: values.description || null,
  };
}
