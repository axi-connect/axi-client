"use client";

import type { UseFormReturn } from "react-hook-form";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import type { ProductTypeDTO } from "@/modules/catalog/domain/product-type";
import {
  createProductType,
  updateProductType,
} from "@/modules/catalog/infrastructure/services/product-type-service.adapter";
import {
  buildProductTypeFormFields,
  defaultProductTypeFormValues,
  productTypeFormSchema,
  toCreateProductTypeDTO,
  toUpdateProductTypeDTO,
  type ProductTypeFormValues,
} from "./config/product-type.config";
import type { AppAlert } from "@/core/notifications";

export type ProductTypeFormProps = {
  /** Presente en edición; ausente en creación. */
  productTypeId?: string;
  defaultValues?: Partial<ProductTypeFormValues>;
  submitLabel?: string;
  onSaved?: (productType: ProductTypeDTO) => void | Promise<void>;
  setAlert?: (alert: AppAlert) => void;
};

export function ProductTypeForm({
  productTypeId,
  defaultValues,
  submitLabel,
  onSaved,
  setAlert,
}: ProductTypeFormProps) {
  const isEdit = Boolean(productTypeId);

  const handleSubmit = async (
    values: ProductTypeFormValues,
    form: UseFormReturn<ProductTypeFormValues>,
  ) => {
    try {
      const saved = productTypeId
        ? await updateProductType(productTypeId, toUpdateProductTypeDTO(values))
        : await createProductType(toCreateProductTypeDTO(values));
      setAlert?.({
        tone: "success",
        title: isEdit ? "Tipo de producto actualizado" : "Tipo de producto creado",
      });
      await onSaved?.(saved);
    } catch (err) {
      if (applyServerValidation(err, form)) return;
      setAlert?.({
        tone: "error",
        title: errorMessage(err, isEdit ? "No se pudo actualizar el tipo" : "No se pudo crear el tipo"),
      });
    }
  };

  return (
    <DynamicForm
      gap={4}
      id="product-type-form"
      onSubmit={handleSubmit}
      schema={productTypeFormSchema}
      columns={{ sm: 1, md: 2 }}
      defaultValues={{ ...defaultProductTypeFormValues, ...(defaultValues ?? {}) }}
      fields={buildProductTypeFormFields()}
      actions={{ submitLabel: submitLabel ?? (isEdit ? "Guardar tipo" : "Crear tipo") }}
    />
  );
}
