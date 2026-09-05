"use client";

import { DraftBackButton, DynamicForm } from "@/shared/components/features/dynamic-form";
import {
  buildCompanyIdentityFields,
  companyIdentitySchema,
  type CompanyIdentityValues,
  type CompanyStepValues,
} from "@/modules/onboarding/ui/signup/config/company-step.config";
import { SignupActions } from "@/modules/onboarding/ui/signup/SignupActions";

/** Pantalla «Empresa»: cómo se llama (nombre + NIT). «Continuar» valida; «Atrás» conserva el borrador. */
export function CompanyIdentityStep({
  defaultValues,
  nitError,
  onBack,
  onNext,
}: {
  defaultValues: CompanyStepValues;
  /** Error del backend a mostrar inline en NIT (`nit_taken`, `nit_invalid`). */
  nitError?: string | null;
  onBack: (draft: CompanyIdentityValues) => void;
  onNext: (values: CompanyIdentityValues) => void;
}) {
  return (
    <DynamicForm<CompanyIdentityValues>
      schema={companyIdentitySchema}
      defaultValues={{ name: defaultValues.name, nit: defaultValues.nit }}
      fields={buildCompanyIdentityFields(nitError)}
      columns={{ base: 1 }}
      className="w-full max-w-[440px] items-center"
      onSubmit={(values) => onNext(values)}
      actions={{
        render: ({ submitting }) => (
          <SignupActions label="Continuar" submitting={submitting} back={<DraftBackButton<CompanyIdentityValues> onBack={onBack} />} />
        ),
      }}
    />
  );
}
