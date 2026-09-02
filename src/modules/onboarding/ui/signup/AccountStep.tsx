"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/shared/components/ui/button";
import { DraftBackButton, DynamicForm } from "@/shared/components/features/dynamic-form";
import {
  accountStepSchema,
  buildAccountFields,
  type AccountStepValues,
} from "@/modules/onboarding/ui/signup/config/account-step.config";
import { TurnstileWidget } from "@/modules/onboarding/ui/signup/TurnstileWidget";

/**
 * Paso 3 · Cuenta. El submit ES el alta: `onSubmit` recibe el form para que el
 * orquestador pueda devolver errores del backend al campo (`email_in_use`).
 * El honeypot vive fuera del schema: no es un dato del usuario.
 */
export function AccountStep({
  defaultValues,
  submitError,
  onBack,
  onSubmit,
  onCaptcha,
  onHoneypot,
}: {
  defaultValues: AccountStepValues;
  /** Error general del alta (rate-limit, captcha, red) mostrado sobre el botón. */
  submitError: string | null;
  onBack: (draft: AccountStepValues) => void;
  onSubmit: (values: AccountStepValues, form: UseFormReturn<AccountStepValues>) => Promise<void>;
  onCaptcha: (token: string) => void;
  onHoneypot: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <DynamicForm<AccountStepValues>
        schema={accountStepSchema}
        defaultValues={defaultValues}
        fields={buildAccountFields()}
        onSubmit={onSubmit}
        actions={{
          render: ({ submitting }) => (
            <div className="flex w-full flex-col gap-4">
              <TurnstileWidget onToken={onCaptcha} />
              {/* Honeypot: invisible y fuera del orden de tabulación; un bot lo rellena. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label>
                  Sitio web
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" onChange={(event) => onHoneypot(event.target.value)} />
                </label>
              </div>
              {submitError ? (
                <p role="alert" className="border-destructive/40 bg-destructive/8 rounded-xl border px-4 py-3 text-sm">
                  {submitError}
                </p>
              ) : null}
              <div className="border-border/70 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                <DraftBackButton<AccountStepValues> onBack={onBack} />
                <div className="flex flex-col items-end gap-1.5">
                  <Button type="submit" size="lg" className="h-11" disabled={submitting}>
                    {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
                    {submitting ? "Creando tu cuenta…" : "Crear mi cuenta y empezar"}
                    {!submitting ? <ArrowRight aria-hidden="true" /> : null}
                  </Button>
                  <span className="text-muted-foreground text-xs">Sin tarjeta. Entras directo a configurar tu empresa.</span>
                </div>
              </div>
            </div>
          ),
        }}
      />
    </div>
  );
}
