"use client";

/**
 * Botón «Atrás» de un paso del wizard: NO valida — entrega los valores
 * actuales del form (borrador) para que el orquestador los conserve.
 * Funciona dentro de cualquier `DynamicForm` (usa el FormProvider de RHF).
 */
import { useFormContext, type FieldValues } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function DraftBackButton<TValues extends FieldValues>({
  onBack,
}: {
  onBack: (draft: TValues) => void;
}) {
  const { getValues } = useFormContext<TValues>();
  return (
    <Button type="button" variant="ghost" onClick={() => onBack(getValues())}>
      <ArrowLeft aria-hidden="true" />
      Atrás
    </Button>
  );
}
