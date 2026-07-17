"use client";

/**
 * Drawer de crear/editar plan: `DetailSheet` compartido (children libres)
 * hospedando un `DynamicForm`. En edición, `code` y `tier` van con candado
 * («Inmutable tras la creación» — el PATCH ni los acepta). El set de límites
 * usa el `LimitsEditor` compartido con validación viva.
 * `usage/plan_code_taken` → error inline en `code`, el drawer no se cierra.
 */
import { Lock } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useAlert } from "@/core/providers/alert-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { isHttpError } from "@/core/api/problem";
import { Button } from "@/shared/components/ui/button";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import {
  createCustomField,
  createInputField,
  DynamicForm,
} from "@/shared/components/features/dynamic-form";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { validateLimits, type LimitInput } from "../../../domain/limits";
import type { PlanListItem } from "../../../domain/plan";
import { useCreatePlan, useUpdatePlan } from "../../../infrastructure/api/hooks/use-plans";
import { LimitsEditor } from "../limits/LimitsEditor";
import { defaultPlanFormValues, planFormSchema, type PlanFormValues } from "./plan-form.config";

type PlanFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plan a editar; `null` = crear. */
  plan: PlanListItem | null;
};

const IMMUTABLE_HINT = (
  <span className="flex items-center gap-1 text-xs text-muted-foreground">
    <Lock aria-hidden="true" className="size-3" />
    Inmutable tras la creación
  </span>
);

export function PlanFormSheet({ open, onOpenChange, plan }: PlanFormSheetProps) {
  const { showAlert } = useAlert();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const isEditing = plan !== null;

  const defaultValues: PlanFormValues = isEditing
    ? {
        code: plan.code,
        name: plan.name,
        description: plan.description ?? "",
        tier: plan.tier,
        default_limits: plan.default_limits,
      }
    : defaultPlanFormValues;

  const fields: FieldConfig<PlanFormValues>[] = [
    createInputField<PlanFormValues>("code", {
      label: "Código *",
      placeholder: "sbs_pro",
      autoComplete: "off",
      description: isEditing ? IMMUTABLE_HINT : "Minúsculas, números y guion bajo (ej. sbs_pro).",
      inputProps: { disabled: isEditing, className: "font-mono" },
    }),
    createInputField<PlanFormValues>("name", {
      label: "Nombre *",
      placeholder: "SBS Pro",
      autoComplete: "off",
    }),
    createCustomField<PlanFormValues>("tier", ({ value, setValue }) => (
      <Select
        value={String(value ?? "sbs")}
        onValueChange={(tier) => setValue("tier", tier as PlanFormValues["tier"])}
        disabled={isEditing}
      >
        <SelectTrigger className="w-full" aria-label="Tier del plan">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sbs">sbs — base de datos compartida</SelectItem>
          <SelectItem value="enterprise">enterprise — base de datos dedicada</SelectItem>
        </SelectContent>
      </Select>
    ), { label: "Tier", description: isEditing ? IMMUTABLE_HINT : undefined }),
    createInputField<PlanFormValues>("description", {
      label: "Descripción",
      inputKind: "textarea",
      placeholder: "Para equipos en crecimiento…",
      colSpan: { base: 1, md: 2 },
    }),
    createCustomField<PlanFormValues>("default_limits", ({ value, setValue }) => {
      const limits = (value as LimitInput[]) ?? [];
      return (
        <LimitsEditor
          value={limits}
          onChange={(next) => setValue("default_limits", next)}
          // Validación viva: mismos mensajes que bloquean el submit (zod).
          issues={validateLimits(limits)}
        />
      );
    }, { label: "Límites por defecto", colSpan: { base: 1, md: 2 } }),
  ];

  async function onSubmit(values: PlanFormValues, form: UseFormReturn<PlanFormValues>) {
    try {
      if (isEditing) {
        await updatePlan.mutateAsync({
          id: plan.id,
          body: {
            name: values.name,
            description: values.description || null,
            // Requerido por el DTO del PATCH: siempre viaja el set completo.
            default_limits: values.default_limits,
          },
        });
      } else {
        await createPlan.mutateAsync({
          code: values.code,
          name: values.name,
          tier: values.tier,
          default_limits: values.default_limits,
          ...(values.description ? { description: values.description } : {}),
        });
      }
      showAlert({
        tone: "success",
        title: isEditing ? "Plan actualizado" : "Plan creado",
        description: `${values.name} quedó ${isEditing ? "al día" : "disponible para asignar"}.`,
        autoCloseMs: 5000,
      });
      onOpenChange(false);
    } catch (error) {
      if (isHttpError(error) && error.is("usage/plan_code_taken")) {
        form.setError("code", { message: "Este código ya existe en la plataforma." });
        return;
      }
      showAlert({ tone: "error", title: "No se pudo guardar el plan", description: errorMessage(error) });
    }
  }

  const pending = createPlan.isPending || updatePlan.isPending;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? `Editar plan · ${plan.name}` : "Crear plan"}
      subtitle={isEditing ? undefined : "Código y tier no podrán cambiarse después."}
      size="xl"
    >
      <div className="p-4">
        <DynamicForm<PlanFormValues>
          schema={planFormSchema}
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
