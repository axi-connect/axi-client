"use client";

import { useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
import { isHttpError } from "@/core/api/problem";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import { BRANCH_ERROR_CODES, type BranchDTO } from "@/modules/companies/domain/branch";
import {
  createBranch,
  replaceBranchSchedules,
  updateBranch,
} from "@/modules/companies/infrastructure/services/branches-service.adapter";
import { searchBranchPlaces } from "@/modules/companies/infrastructure/services/geo.adapter";
import {
  branchFormSchema,
  buildBranchFormFields,
  toBranchScheduleInputs,
  toCreateBranchDTO,
  toUpdateBranchDTO,
  type BranchFormValues,
} from "@/modules/companies/ui/forms/config/branch.config";

/**
 * Crear/editar una sucursal: `DetailSheet` con `DynamicForm`. Guardar hace dos
 * llamadas cuando hace falta (la sede y, si cambió, su horario propio); el
 * 409 de nombre repetido se pinta bajo «Nombre» y el sheet se queda abierto.
 */
export function BranchFormSheet({
  open,
  branch,
  initialValues,
  countryCode,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  /** `null` = crear. */
  branch: BranchDTO | null;
  initialValues: BranchFormValues;
  countryCode: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { showAlert } = useAlert();
  const isEditing = branch !== null;
  const onSearch = useCallback((query: string) => searchBranchPlaces(query, countryCode), [countryCode]);

  async function onSubmit(values: BranchFormValues, form: UseFormReturn<BranchFormValues>) {
    try {
      const saved = isEditing
        ? await updateBranch(branch.id, toUpdateBranchDTO(values, branch))
        : await createBranch(toCreateBranchDTO(values, countryCode));
      const schedules = toBranchScheduleInputs(values);
      const hadOwnHours = isEditing && branch.schedules.length > 0;
      if (schedules.length > 0 || hadOwnHours) {
        await replaceBranchSchedules(saved.id, { schedules });
      }
      onSaved();
      onOpenChange(false);
      showAlert({ tone: "success", title: isEditing ? "Sucursal actualizada" : "Sucursal creada", open: true });
    } catch (error) {
      if (applyServerValidation(error, form)) return;
      if (isHttpError(error) && error.is(BRANCH_ERROR_CODES.nameTaken)) {
        form.setError("name", { type: "server", message: errorMessage(error) });
        return;
      }
      showAlert({ tone: "error", title: "No se pudo guardar la sucursal", description: errorMessage(error), open: true });
    }
  }

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? `Editar sucursal · ${branch.name}` : "Agregar sucursal"}
      subtitle="Lo que escribas aquí es lo que la IA le dice al cliente."
      size="lg"
    >
      <div className="p-4">
        <DynamicForm<BranchFormValues>
          id="branch-form"
          schema={branchFormSchema}
          defaultValues={initialValues}
          fields={buildBranchFormFields(onSearch)}
          onSubmit={onSubmit}
          columns={{ base: 1, md: 2 }}
          gap={4}
          actions={{
            render: ({ submitting }) => (
              <div className="flex w-full items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Guardando…" : "Guardar sucursal"}
                </Button>
              </div>
            ),
          }}
        />
      </div>
    </DetailSheet>
  );
}
