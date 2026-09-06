"use client";

import { DraftBackButton, DynamicForm } from "@/shared/components/features/dynamic-form";
import {
  buildCompanyLocationFields,
  companyLocationSchema,
  type CompanyLocationValues,
  type CompanyStepValues,
} from "@/modules/onboarding/ui/signup/config/company-step.config";
import { FlowActions } from "@/modules/onboarding/ui/flow/FlowActions";

/** Pantalla «Ubicación»: dónde opera (país + ciudad; la zona horaria viaja oculta). */
export function CompanyLocationStep({
  defaultValues,
  onBack,
  onNext,
}: {
  defaultValues: CompanyStepValues;
  onBack: (draft: CompanyLocationValues) => void;
  onNext: (values: CompanyLocationValues) => void;
}) {
  return (
    <DynamicForm<CompanyLocationValues>
      schema={companyLocationSchema}
      defaultValues={{ country_code: defaultValues.country_code, city: defaultValues.city, timezone: defaultValues.timezone }}
      fields={buildCompanyLocationFields()}
      columns={{ base: 1 }}
      className="w-full max-w-[440px] items-center"
      onSubmit={(values) => onNext(values)}
      actions={{
        render: ({ submitting }) => (
          <FlowActions label="Continuar" submitting={submitting} back={<DraftBackButton<CompanyLocationValues> onBack={onBack} />} />
        ),
      }}
    />
  );
}
