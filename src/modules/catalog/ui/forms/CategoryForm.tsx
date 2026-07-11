"use client";

import type { UseFormReturn } from "react-hook-form";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import {
  createCategory,
  updateCategory,
} from "@/modules/catalog/infrastructure/services/category-service.adapter";
import {
  buildCategoryFormFields,
  categoryFormSchema,
  defaultCategoryFormValues,
  toCreateCategoryDTO,
  toUpdateCategoryDTO,
  type CategoryFormValues,
  type ParentOption,
} from "./config/category.config";

export type CategoryFormHost = {
  closeModal?: () => void;
  refresh?: () => Promise<void> | void;
  /** Opciones de padre ya filtradas (sin el propio subárbol al editar). */
  parents?: ParentOption[];
  defaultValues?: (Partial<CategoryFormValues> & { id?: string }) | null;
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void;
};

export function CategoryForm({ host }: { host?: CategoryFormHost }) {
  const isEdit = Boolean(host?.defaultValues?.id);

  const handleSubmit = async (values: CategoryFormValues, form: UseFormReturn<CategoryFormValues>) => {
    try {
      const id = host?.defaultValues?.id;
      if (id) {
        await updateCategory(id, toUpdateCategoryDTO(values));
        host?.setAlert?.({ variant: "success", title: "Categoría actualizada correctamente" });
      } else {
        await createCategory(toCreateCategoryDTO(values));
        host?.setAlert?.({ variant: "success", title: "Categoría creada correctamente" });
      }
      await host?.refresh?.();
      host?.closeModal?.();
    } catch (err) {
      if (applyServerValidation(err, form)) return;
      host?.setAlert?.({
        variant: "destructive",
        title: errorMessage(err, isEdit ? "No se pudo actualizar la categoría" : "No se pudo crear la categoría"),
      });
    }
  };

  return (
    <DynamicForm
      gap={4}
      id="category-form"
      onSubmit={handleSubmit}
      schema={categoryFormSchema}
      columns={{ sm: 1, md: 2 }}
      defaultValues={{ ...defaultCategoryFormValues, ...(host?.defaultValues ?? {}) }}
      fields={buildCategoryFormFields({ parents: host?.parents ?? [], isEdit })}
    />
  );
}
