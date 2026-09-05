"use client";

import type { UseFormReturn } from "react-hook-form";

import { DraftBackButton, DynamicForm } from "@/shared/components/features/dynamic-form";
import { offerSummary, type OfferSelection } from "@/modules/onboarding/domain/signup-draft";
import {
  buildPasswordFields,
  passwordSchema,
  type AccountStepValues,
  type PasswordValues,
} from "@/modules/onboarding/ui/signup/config/account-step.config";
import { SignupActions } from "@/modules/onboarding/ui/signup/SignupActions";
import { TurnstileWidget } from "@/modules/onboarding/ui/signup/TurnstileWidget";

/**
 * Pantalla «Cuenta»: la contraseña y los términos. El submit ES el alta:
 * `onSubmit` recibe el form para que el orquestador pueda devolver errores del
 * backend al campo. El honeypot vive fuera del schema: no es un dato del
 * usuario.
 *
 * Antes del CTA va el resumen de lo elegido («hoy pagas $0»): es el recibo que
 * un checkout pone al lado del botón, aquí reducido a una línea de cristal.
 */
export function PasswordStep({
  selection,
  defaultValues,
  submitError,
  onBack,
  onSubmit,
  onCaptcha,
  onHoneypot,
}: {
  selection: OfferSelection | null;
  defaultValues: AccountStepValues;
  /** Error general del alta (rate-limit, captcha, red) mostrado sobre el botón. */
  submitError: string | null;
  onBack: (draft: PasswordValues) => void;
  onSubmit: (values: PasswordValues, form: UseFormReturn<PasswordValues>) => Promise<void>;
  onCaptcha: (token: string) => void;
  onHoneypot: (value: string) => void;
}) {
  const summary = selection ? offerSummary(selection) : null;

  return (
    <DynamicForm<PasswordValues>
      schema={passwordSchema}
      defaultValues={{ password: defaultValues.password, accept_terms: defaultValues.accept_terms }}
      fields={buildPasswordFields()}
      columns={{ base: 1 }}
      className="w-full max-w-[440px] items-center"
      onSubmit={onSubmit}
      actions={{
        render: ({ submitting }) => (
          <div className="flex w-full flex-col items-center gap-3">
            <TurnstileWidget onToken={onCaptcha} />
            {/* Honeypot: invisible y fuera del orden de tabulación; un bot lo rellena. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label>
                Sitio web
                <input type="text" name="website" tabIndex={-1} autoComplete="off" onChange={(event) => onHoneypot(event.target.value)} />
              </label>
            </div>
            {summary ? (
              <dl className="sf-glass flex w-full items-center justify-between gap-3 rounded-[14px] px-4 py-3 text-left text-[13px]" aria-label="Resumen de tu elección">
                <div className="flex min-w-0 flex-col">
                  <dt className="text-muted-foreground text-[11px] font-semibold tracking-[.08em] uppercase">{summary.kind}</dt>
                  <dd className="truncate font-medium">
                    {summary.title}
                    <span className="text-muted-foreground">
                      {summary.lines.map((line) => ` · ${summary.kind === "Paquete" ? line.value : line.label}`).join("")}
                    </span>
                  </dd>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <dt className="sr-only">Después de la prueba</dt>
                  <dd className="font-mono font-semibold tabular-nums">{summary.afterTrial ?? "$0"}</dd>
                  <dd className="text-muted-foreground text-[11.5px]">{summary.afterTrial ? "tras la prueba · hoy $0" : "durante toda la prueba"}</dd>
                </div>
              </dl>
            ) : null}
            {submitError ? (
              <p role="alert" className="sf-glass w-full rounded-[14px] px-4 py-3 text-left text-sm font-medium">
                {submitError}
              </p>
            ) : null}
            <SignupActions
              label="Crear mi cuenta y empezar"
              submittingLabel="Creando tu cuenta…"
              submitting={submitting}
              microcopy="Sin tarjeta. Entras directo a configurar tu empresa."
              back={<DraftBackButton<PasswordValues> onBack={onBack} />}
            />
          </div>
        ),
      }}
    />
  );
}
