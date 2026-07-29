"use client";

import { useMemo } from "react";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { isHttpError } from "@/core/api/problem";
import { useAlert } from "@/core/providers/alert-provider";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import { createDeal } from "@/modules/crm/infrastructure/services/deals-service.adapter";
import { useBoardStore } from "@/modules/crm/infrastructure/stores/board.store";
import {
  buildDealFormFields,
  dealFormSchema,
  defaultDealFormValues,
  toCreateDealDTO,
  type DealFormValues,
} from "./config/deal.config";

/**
 * Alta manual de oportunidad (`POST /crm/deals`) en el pipeline activo.
 * Vive en el Modal interceptado (@form); Guardar dispara `requestSubmit()`
 * por el id `crm-deal-form`. 409 `crm/deal_already_open` → mensaje claro.
 */
export function DealForm({
  presetContact,
  onSuccess,
}: {
  /** Contacto preseleccionado (p.ej. desde el 360). */
  presetContact?: { id: string; label: string };
  onSuccess: (dealId: string) => void;
}) {
  const { showAlert } = useAlert();
  const pipelineId = useBoardStore((s) => s.pipelineId);
  const fetchBoard = useBoardStore((s) => s.fetchBoard);
  const fetchStats = useBoardStore((s) => s.fetchStats);

  const defaultValues = useMemo(() => defaultDealFormValues(presetContact), [presetContact]);
  const fields = useMemo(() => buildDealFormFields(), []);

  return (
    <DynamicForm<DealFormValues>
      id="crm-deal-form"
      schema={dealFormSchema}
      fields={[...fields]}
      defaultValues={defaultValues}
      columns={{ base: 1, md: 2 }}
      actions={{ render: () => null }}
      onSubmit={async (values, form) => {
        try {
          const deal = await createDeal(toCreateDealDTO(values, pipelineId ?? undefined));
          void fetchBoard();
          void fetchStats();
          showAlert({ tone: "success", title: "Oportunidad creada", open: true });
          onSuccess(deal.id);
        } catch (err) {
          if (isHttpError(err) && err.is("crm/deal_already_open")) {
            showAlert({
              tone: "error",
              title: "La conversación de ese contacto ya tiene una oportunidad abierta",
              open: true,
            });
            return;
          }
          if (!applyServerValidation(err, form)) {
            showAlert({
              tone: "error",
              title: errorMessage(err, "No se pudo crear la oportunidad"),
              open: true,
            });
          }
        }
      }}
    />
  );
}
