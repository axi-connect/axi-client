"use client";

import { useMemo } from "react";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import type { AutomationDTO } from "@/modules/marketing/domain/automation";
import type { TriggerType } from "@/modules/marketing/domain/enums";
import type { PromotionDTO } from "@/modules/marketing/domain/promotion";
import {
  createAutomation,
  updateAutomation,
} from "@/modules/marketing/infrastructure/services/automations-service.adapter";
import {
  automationFormSchema,
  automationToFormValues,
  buildAutomationFormFields,
  defaultAutomationFormValues,
  toCreateAutomationDTO,
  toUpdateAutomationDTO,
  type AutomationFormValues,
} from "./config/automation.config";

export const AUTOMATION_FORM_ID = "marketing-automation-form";

/**
 * Alta y edición de una regla de recuperación. El botón de guardar lo aporta el
 * sheet y dispara `requestSubmit()` sobre este form.
 *
 * Crear NUNCA enciende: `toCreateAutomationDTO` fuerza `enabled: false` y editar
 * ni siquiera manda el campo, para que guardar un cambio de texto no apague una
 * regla que estaba trabajando.
 */
export function AutomationForm({
  automation,
  trigger,
  promotions,
  onSaved,
}: {
  automation: AutomationDTO | null;
  trigger: TriggerType;
  promotions: PromotionDTO[];
  onSaved: (automation: AutomationDTO) => void;
}) {
  const { showAlert } = useAlert();

  const defaultValues = useMemo<AutomationFormValues>(
    () =>
      automation ? automationToFormValues(automation) : defaultAutomationFormValues(trigger),
    [automation, trigger],
  );

  const fields = useMemo(
    () => buildAutomationFormFields({ promotions, editing: automation !== null }),
    [promotions, automation],
  );

  return (
    <DynamicForm<AutomationFormValues>
      id={AUTOMATION_FORM_ID}
      schema={automationFormSchema}
      fields={fields}
      defaultValues={defaultValues}
      columns={{ base: 1, md: 2 }}
      actions={{ render: () => null }}
      onSubmit={async (values, form) => {
        try {
          const saved = automation
            ? await updateAutomation(automation.id, toUpdateAutomationDTO(values))
            : await createAutomation(toCreateAutomationDTO(values));
          showAlert({
            tone: "success",
            title: automation ? "Regla actualizada" : "Regla creada, apagada",
            open: true,
          });
          onSaved(saved);
        } catch (error) {
          if (!applyServerValidation(error, form)) {
            showAlert({
              tone: "error",
              title: errorMessage(error, "No se pudo guardar la regla"),
              open: true,
            });
          }
        }
      }}
    />
  );
}
