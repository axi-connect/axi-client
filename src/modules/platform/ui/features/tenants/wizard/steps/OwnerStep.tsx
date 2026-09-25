"use client";

/**
 * Paso 2 · Propietario: nombre y correo. La contraseña no se pide ni se
 * genera aquí: el dueño la crea con el enlace de un solo uso de la bienvenida.
 */
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import { DraftBackButton } from "../DraftBackButton";
import {
  buildOwnerFields,
  defaultOwnerStepValues,
  ownerStepSchema,
  type OwnerStepValues,
} from "./owner-step.config";

type OwnerStepProps = {
  defaultValues: OwnerStepValues;
  onBack: (values: OwnerStepValues) => void;
  onNext: (values: OwnerStepValues) => void;
};

export function OwnerStep({ defaultValues, onBack, onNext }: OwnerStepProps) {
  return (
    <DynamicForm<OwnerStepValues>
      schema={ownerStepSchema}
      defaultValues={{ ...defaultOwnerStepValues, ...defaultValues }}
      fields={buildOwnerFields()}
      onSubmit={(values) => onNext(values)}
      actions={{
        render: ({ submitting }) => (
          <div className="flex w-full items-center justify-between">
            <DraftBackButton<OwnerStepValues> onBack={onBack} />
            <Button type="submit" disabled={submitting}>
              Siguiente
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        ),
      }}
    />
  );
}
