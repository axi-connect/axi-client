"use client";

/**
 * Sheet de metadatos de suite (crear/editar). La composición de escenarios
 * se gestiona aparte en `SuiteScenariosSheet`. 409 `quality/suite_code_taken`
 * → error inline en `code`, sin cerrar.
 */
import { Lock } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import {
  createInputField,
  DynamicForm,
  type FieldConfig,
} from "@/shared/components/features/dynamic-form";
import type { SuiteListItem } from "../../../../domain/quality";
import { useCreateSuite, useUpdateSuite } from "../../../../infrastructure/api/hooks/use-quality-suites";
import {
  defaultSuiteFormValues,
  suiteFormSchema,
  suiteToFormValues,
  toCreateSuiteDTO,
  toUpdateSuiteDTO,
  type SuiteFormValues,
} from "./suite-form.config";

type SuiteFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Suite a editar; `null` = crear. */
  suite: SuiteListItem | null;
  /** Tras crear, abre la composición para añadir escenarios (id nuevo). */
  onCreated?: (id: string) => void;
};

export function SuiteFormSheet({ open, onOpenChange, suite, onCreated }: SuiteFormSheetProps) {
  const { showAlert } = useAlert();
  const createSuite = useCreateSuite();
  const updateSuite = useUpdateSuite();
  const isEditing = suite !== null;

  const defaultValues: SuiteFormValues = isEditing ? suiteToFormValues(suite) : defaultSuiteFormValues;

  const fields: FieldConfig<SuiteFormValues>[] = [
    createInputField<SuiteFormValues>("code", {
      label: "Código *",
      placeholder: "smoke_ventas",
      autoComplete: "off",
      description: isEditing ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock aria-hidden="true" className="size-3" />
          Inmutable tras la creación
        </span>
      ) : (
        "Minúsculas, números y guion bajo (ej. smoke_ventas)."
      ),
      inputProps: { disabled: isEditing, className: "font-mono" },
    }),
    createInputField<SuiteFormValues>("name", {
      label: "Nombre *",
      placeholder: "Smoke de ventas",
      autoComplete: "off",
    }),
    createInputField<SuiteFormValues>("description", {
      label: "Descripción",
      inputKind: "textarea",
      placeholder: "Qué cubre esta suite…",
      colSpan: { base: 1, md: 2 },
    }),
  ];

  async function onSubmit(values: SuiteFormValues, form: UseFormReturn<SuiteFormValues>) {
    try {
      if (isEditing) {
        await updateSuite.mutateAsync({ id: suite.id, body: toUpdateSuiteDTO(values) });
        showAlert({
          tone: "success",
          title: "Suite actualizada",
          description: `${values.name} quedó al día.`,
          autoCloseMs: 5000,
        });
        onOpenChange(false);
      } else {
        const { id } = await createSuite.mutateAsync(toCreateSuiteDTO(values));
        showAlert({
          tone: "success",
          title: "Suite creada",
          description: "Ahora añade los escenarios que la componen.",
          autoCloseMs: 5000,
        });
        onOpenChange(false);
        onCreated?.(id);
      }
    } catch (error) {
      if (isHttpError(error) && error.is("quality/suite_code_taken")) {
        form.setError("code", { message: "Este código ya existe." });
        return;
      }
      showAlert({ tone: "error", title: "No se pudo guardar la suite", description: errorMessage(error) });
    }
  }

  const pending = createSuite.isPending || updateSuite.isPending;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? `Editar suite · ${suite.name}` : "Nueva suite"}
      subtitle={isEditing ? undefined : "El código no podrá cambiarse después."}
      size="md"
    >
      <div className="p-4">
        <DynamicForm<SuiteFormValues>
          schema={suiteFormSchema}
          defaultValues={defaultValues}
          fields={fields}
          onSubmit={onSubmit}
          actions={{
            render: ({ submitting }) => (
              <div className="flex w-full items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting || pending}>
                  {pending ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            ),
          }}
        />
      </div>
    </DetailSheet>
  );
}
