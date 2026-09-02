"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { DraftBackButton, DynamicForm } from "@/shared/components/features/dynamic-form";
import {
  buildCompanyFields,
  companyStepSchema,
  type CompanyStepValues,
} from "@/modules/onboarding/ui/signup/config/company-step.config";

/** Paso 2 · Empresa. «Continuar» es el submit; «Atrás» conserva el borrador sin validar. */
export function CompanyStep({
  defaultValues,
  nitError,
  onBack,
  onNext,
}: {
  defaultValues: CompanyStepValues;
  /** Error del backend a mostrar inline en NIT (`nit_taken`, `nit_invalid`). */
  nitError?: string | null;
  onBack: (draft: CompanyStepValues) => void;
  onNext: (values: CompanyStepValues) => void;
}) {
  return (
    <DynamicForm<CompanyStepValues>
      schema={companyStepSchema}
      defaultValues={defaultValues}
      fields={buildCompanyFields(nitError)}
      onSubmit={(values) => onNext(values)}
      actions={{
        render: ({ submitting }) => (
          <div className="border-border/70 flex w-full flex-wrap items-center justify-between gap-3 border-t pt-5">
            <DraftBackButton<CompanyStepValues> onBack={onBack} />
            <Button type="submit" size="lg" className="h-11" disabled={submitting}>
              Continuar
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        ),
      }}
    />
  );
}
