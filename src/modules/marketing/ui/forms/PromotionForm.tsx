"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import type { PromotionDTO } from "@/modules/marketing/domain/promotion";
import {
  createPromotion,
  updatePromotion,
} from "@/modules/marketing/infrastructure/services/promotions-service.adapter";
import {
  buildPromotionFormFields,
  defaultPromotionFormValues,
  promotionFormSchema,
  promotionToFormValues,
  toCreatePromotionDTO,
  toUpdatePromotionDTO,
  type PromotionFormValues,
} from "./config/promotion.config";

export const PROMOTION_FORM_ID = "marketing-promotion-form";

/**
 * Alta y edición de una promoción. El botón de guardar lo aporta el sheet que
 * lo contiene y dispara `requestSubmit()` sobre este form (convención del
 * repo), por eso `actions` no renderiza nada.
 *
 * Las promociones nacen APAGADAS: encenderlas es una decisión aparte y
 * explícita desde la lista, no una casilla escondida en el alta.
 */
export function PromotionForm({
  promotion,
  onSaved,
}: {
  promotion: PromotionDTO | null;
  onSaved: (promotion: PromotionDTO) => void;
}) {
  const { showAlert } = useAlert();

  const defaultValues = useMemo<PromotionFormValues>(
    () => (promotion ? promotionToFormValues(promotion) : defaultPromotionFormValues),
    [promotion],
  );

  const fields = useMemo(() => buildPromotionFormFields(), []);

  return (
    <div className="space-y-4">
      <DynamicForm<PromotionFormValues>
        id={PROMOTION_FORM_ID}
        schema={promotionFormSchema}
        fields={fields}
        defaultValues={defaultValues}
        columns={{ base: 1, md: 2 }}
        actions={{ render: () => null }}
        onSubmit={async (values, form) => {
          try {
            const saved = promotion
              ? await updatePromotion(promotion.id, toUpdatePromotionDTO(values))
              : await createPromotion(toCreatePromotionDTO(values));
            showAlert({
              tone: "success",
              title: promotion ? "Promoción actualizada" : "Promoción creada",
              open: true,
            });
            onSaved(saved);
          } catch (error) {
            // Si el backend señala campos concretos, se marcan en el formulario;
            // si no, una alerta con el mensaje del código de error.
            if (!applyServerValidation(error, form)) {
              showAlert({
                tone: "error",
                title: errorMessage(error, "No se pudo guardar la promoción"),
                open: true,
              });
            }
          }
        }}
      />

      <p className="flex gap-2.5 rounded-xl border border-info/25 bg-info/5 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
        <span>
          Solo se aplica <strong className="font-medium text-foreground">una promoción por
          pedido</strong>. Y si tu asesor ya puso un descuento a mano, el cupón se rechaza: manda el
          humano.
        </span>
      </p>
    </div>
  );
}
