"use client";

/** Paso 1 · Empresa — `DynamicForm` declarativo; "Siguiente" es el submit. */
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import {
  buildCompanyFields,
  companyStepSchema,
  type CompanyStepValues,
} from "./company-step.config";

type CompanyStepProps = {
  defaultValues: CompanyStepValues;
  /** Error del backend (`identities/nit_taken`) a mostrar inline en NIT. */
  nitError?: string | null;
  onNext: (values: CompanyStepValues) => void;
};

export function CompanyStep({ defaultValues, nitError, onNext }: CompanyStepProps) {
  const router = useRouter();

  return (
    <DynamicForm<CompanyStepValues>
      schema={companyStepSchema}
      defaultValues={defaultValues}
      fields={buildCompanyFields(nitError)}
      onSubmit={(values) => onNext(values)}
      actions={{
        render: ({ submitting }) => (
          <div className="flex w-full items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push("/platform/tenants")}>
              Cancelar
            </Button>
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
