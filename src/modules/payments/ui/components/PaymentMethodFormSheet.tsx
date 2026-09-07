"use client";

import type { UseFormReturn } from "react-hook-form";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { applyServerValidation } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import { PAYMENT_ERROR_CODES, type PaymentMethodDTO } from "@/modules/payments/domain/payment-method";
import {
  createPaymentMethod,
  updatePaymentMethod,
} from "@/modules/payments/infrastructure/services/payment-methods-service.adapter";
import {
  buildPaymentMethodFields,
  defaultPaymentMethodValues,
  paymentMethodFormSchema,
  paymentMethodToFormValues,
  toCreatePaymentMethodDTO,
  toUpdatePaymentMethodDTO,
  type PaymentMethodFormValues,
} from "@/modules/payments/ui/forms/config/payment-method.config";

/**
 * Crear/editar un medio de pago: `DetailSheet` (superficie flotante, glass)
 * hospedando un `DynamicForm` (patrón PlanFormSheet). El 409 de nombre repetido
 * se pinta bajo el campo, no en un toast, y el sheet se queda abierto.
 */
export function PaymentMethodFormSheet({
  open,
  method,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  /** `null` = crear. */
  method: PaymentMethodDTO | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (saved: PaymentMethodDTO) => void;
}) {
  const { showAlert } = useAlert();
  const isEditing = method !== null;

  async function onSubmit(values: PaymentMethodFormValues, form: UseFormReturn<PaymentMethodFormValues>) {
    try {
      const saved = isEditing
        ? await updatePaymentMethod(method.id, toUpdatePaymentMethodDTO(values, method))
        : await createPaymentMethod(toCreatePaymentMethodDTO(values));
      onSaved(saved);
      onOpenChange(false);
      showAlert({ tone: "success", title: isEditing ? "Medio de pago actualizado" : "Medio de pago creado", open: true });
    } catch (error) {
      if (applyServerValidation(error, form)) return;
      if (isHttpError(error) && error.is(PAYMENT_ERROR_CODES.labelTaken)) {
        form.setError("label", { type: "server", message: errorMessage(error) });
        return;
      }
      showAlert({ tone: "error", title: "No se pudo guardar el medio de pago", description: errorMessage(error), open: true });
    }
  }

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? `Editar · ${method.label}` : "Agregar medio de pago"}
      subtitle="La IA lo compartirá tal cual cuando el cliente pregunte cómo pagar."
      size="lg"
    >
      <div className="p-4">
        <DynamicForm<PaymentMethodFormValues>
          id="payment-method-form"
          schema={paymentMethodFormSchema}
          defaultValues={isEditing ? paymentMethodToFormValues(method) : defaultPaymentMethodValues}
          fields={buildPaymentMethodFields()}
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
                  {submitting ? "Guardando…" : "Guardar medio de pago"}
                </Button>
              </div>
            ),
          }}
        />
      </div>
    </DetailSheet>
  );
}
