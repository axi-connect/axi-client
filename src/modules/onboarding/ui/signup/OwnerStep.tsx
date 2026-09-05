"use client";

import { DraftBackButton, DynamicForm } from "@/shared/components/features/dynamic-form";
import {
  buildOwnerFields,
  ownerSchema,
  type AccountStepValues,
  type OwnerValues,
} from "@/modules/onboarding/ui/signup/config/account-step.config";
import { SignupActions } from "@/modules/onboarding/ui/signup/SignupActions";

/** Pantalla «Tú»: quién será la persona propietaria (nombre + correo). */
export function OwnerStep({
  defaultValues,
  emailError,
  onBack,
  onNext,
}: {
  defaultValues: AccountStepValues;
  /** Error del backend a mostrar inline en el correo (`email_in_use`, `email_disposable`). */
  emailError?: string | null;
  onBack: (draft: OwnerValues) => void;
  onNext: (values: OwnerValues) => void;
}) {
  return (
    <DynamicForm<OwnerValues>
      schema={ownerSchema}
      defaultValues={{ name: defaultValues.name, email: defaultValues.email }}
      fields={buildOwnerFields(emailError)}
      columns={{ base: 1 }}
      className="w-full max-w-[440px] items-center"
      onSubmit={(values) => onNext(values)}
      actions={{
        render: ({ submitting }) => (
          <SignupActions label="Continuar" submitting={submitting} back={<DraftBackButton<OwnerValues> onBack={onBack} />} />
        ),
      }}
    />
  );
}
