"use client";

import type { UseFormReturn } from "react-hook-form";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import {
  createCatalog,
  updateCatalog,
} from "@/modules/catalog/infrastructure/services/catalog-service.adapter";
import {
  buildCatalogFormFields,
  catalogFormSchema,
  defaultCatalogFormValues,
  toCreateCatalogDTO,
  toUpdateCatalogDTO,
  type CatalogFormValues,
} from "./config/catalog.config";

export type CatalogFormHost = {
  closeModal?: () => void;
  refresh?: () => Promise<void> | void;
  defaultValues?: (Partial<CatalogFormValues> & { id?: string }) | null;
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void;
};

export function CatalogForm({ host }: { host?: CatalogFormHost }) {
  const isEdit = Boolean(host?.defaultValues?.id);

  const handleSubmit = async (values: CatalogFormValues, form: UseFormReturn<CatalogFormValues>) => {
    try {
      const id = host?.defaultValues?.id;
      if (id) {
        await updateCatalog(id, toUpdateCatalogDTO(values));
        host?.setAlert?.({ variant: "success", title: "Catálogo actualizado correctamente" });
      } else {
        await createCatalog(toCreateCatalogDTO(values));
        host?.setAlert?.({ variant: "success", title: "Catálogo creado correctamente" });
      }
      await host?.refresh?.();
      host?.closeModal?.();
    } catch (err) {
      if (applyServerValidation(err, form)) return;
      host?.setAlert?.({
        variant: "destructive",
        title: errorMessage(err, isEdit ? "No se pudo actualizar el catálogo" : "No se pudo crear el catálogo"),
      });
    }
  };

  return (
    <DynamicForm
      gap={4}
      id="catalog-form"
      onSubmit={handleSubmit}
      schema={catalogFormSchema}
      columns={{ sm: 1, md: 2 }}
      defaultValues={{ ...defaultCatalogFormValues, ...(host?.defaultValues ?? {}) }}
      fields={buildCatalogFormFields()}
    />
  );
}
