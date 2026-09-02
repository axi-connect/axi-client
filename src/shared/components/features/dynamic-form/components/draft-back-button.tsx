"use client";

/**
 * Botón «Atrás» de un paso de wizard: NO valida — entrega los valores actuales
 * del form (borrador) para que el orquestador los conserve. Funciona dentro de
 * cualquier `DynamicForm` (usa el FormProvider de RHF).
 *
 * Vivía en el wizard de alta de `/platform`; se promueve aquí porque el
 * registro autoservicio (`/comenzar`) lo necesita y un slice no puede importar
 * de la `ui/` de otro.
 */
import { useFormContext, type FieldValues } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function DraftBackButton<TValues extends FieldValues>({
  onBack,
  label = "Atrás",
}: {
  onBack: (draft: TValues) => void;
  label?: string;
}) {
  const { getValues } = useFormContext<TValues>();
  return (
    <Button type="button" variant="ghost" onClick={() => onBack(getValues())}>
      <ArrowLeft aria-hidden="true" />
      {label}
    </Button>
  );
}
