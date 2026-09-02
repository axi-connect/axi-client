"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { API_ERROR_CODES } from "@/core/api/problem";
import { track } from "@/core/analytics/track";
import { messageForCode } from "@/core/lib/error-messages";
import { LoginError } from "@/core/providers/auth-provider";
import { useSplashOptional } from "@/core/providers/splash-provider";
import { useAuth, useSession } from "@/shared/auth/auth.hooks";
import { StepIndicator } from "@/shared/components/ui/step-indicator";
import {
  EMPTY_SIGNUP_DRAFT,
  SIGNUP_NEXT_PATH,
  SIGNUP_STEPS,
  SIGNUP_STEP_LABELS,
  blockerForSignupStep,
  parseOfferQuery,
  toSignupPayload,
  type OfferSelection,
  type SignupDraft,
} from "@/modules/onboarding/domain/signup-draft";
import {
  clearSignupDraft,
  readSignupDraft,
  writeSignupDraft,
} from "@/modules/onboarding/infrastructure/storage/signup-draft.storage";
import { AccountStep } from "@/modules/onboarding/ui/signup/AccountStep";
import { CompanyStep } from "@/modules/onboarding/ui/signup/CompanyStep";
import { OfferStep } from "@/modules/onboarding/ui/signup/OfferStep";
import { SignupSummaryRail } from "@/modules/onboarding/ui/signup/SignupSummaryRail";
import { accountDraftToValues, type AccountStepValues } from "@/modules/onboarding/ui/signup/config/account-step.config";
import { companyDraftToValues, type CompanyStepValues } from "@/modules/onboarding/ui/signup/config/company-step.config";

const STEP_COPY = [
  {
    title: "Elige cómo quieres empezar",
    lead: "Todo arranca con 7 días de prueba sin tarjeta. Cambia de opinión cuando quieras: la prueba es la misma.",
  },
  {
    title: "Cuéntanos de tu empresa",
    lead: "Lo justo para crear tu cuenta. El resto lo configuras después, con guía.",
  },
  {
    title: "Crea tu cuenta",
    lead: "Serás la persona propietaria de la cuenta: podrás invitar a tu equipo y asignar permisos después.",
  },
] as const;

/**
 * Orquestador de `/comenzar` (mockup F0-B, aprobado 2026-09-01).
 *
 * El borrador vive en estado local y se refleja en `sessionStorage` sin la
 * contraseña. La URL preselecciona la oferta (`?plan=`, `?modulo=`) y gana
 * sobre lo guardado: quien llega desde un CTA nuevo quiere ESA oferta.
 *
 * Errores del alta, por `code`: NIT repetido o inválido → vuelve al paso 2 con
 * el error en el campo; correo en uso o desechable → error en el campo del
 * paso 3; el resto (captcha, rate-limit, red) → aviso sobre el botón.
 */
export function SignupFunnelView() {
  const router = useRouter();
  const search = useSearchParams();
  const { signup } = useAuth();
  const { isAuthenticated } = useSession();
  const splash = useSplashOptional();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<SignupDraft>(EMPTY_SIGNUP_DRAFT);
  const [ready, setReady] = useState(false);
  const [nitError, setNitError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const captchaRef = useRef("");
  const honeypotRef = useRef("");
  const initializedRef = useRef(false);

  // Estado inicial en efecto y no en render: `sessionStorage` no existe en el
  // servidor y la página se prerenderiza. Se ejecuta UNA vez: la URL de
  // llegada decide la oferta; navegar entre pasos no la vuelve a leer.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const stored = readSignupDraft();
    const fromQuery = parseOfferQuery(search);
    if (fromQuery.redirectTo) {
      router.replace(fromQuery.redirectTo);
      return;
    }
    const offer = fromQuery.selection ?? stored?.offer ?? null;
    const company = stored?.company ?? null;
    setDraft({ offer, company, account: null });
    // Con oferta en la URL se entra directo a Empresa; si no, al paso guardado.
    const initialStep = fromQuery.selection ? 1 : Math.min(stored?.step ?? 0, 2);
    setStep(blockerForSignupStep(SIGNUP_STEPS[initialStep].code, { offer, company, account: null }) ? 0 : initialStep);
    setReady(true);
  }, [router, search]);

  useEffect(() => {
    if (!ready) return;
    writeSignupDraft({ offer: draft.offer, company: draft.company, step });
  }, [ready, draft.offer, draft.company, step]);

  useEffect(() => {
    if (!ready) return;
    track({ name: "signup_step_view", params: { step: SIGNUP_STEPS[step].code } });
  }, [ready, step]);

  const setOffer = useCallback((offer: OfferSelection | null) => {
    setDraft((current) => ({ ...current, offer }));
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (blockerForSignupStep(SIGNUP_STEPS[index].code, draft)) return;
      setStep(index);
    },
    [draft],
  );

  async function submitAccount(values: AccountStepValues, form: UseFormReturn<AccountStepValues>) {
    setSubmitError(null);
    const nextDraft: SignupDraft = { ...draft, account: values };
    setDraft(nextDraft);

    try {
      const payload = toSignupPayload(nextDraft, { captcha_token: captchaRef.current, website: honeypotRef.current });
      await signup(payload);
      clearSignupDraft();
      track({ name: "signup_completed", params: { offer_codes: payload.offer.codes.join(",") } });
      splash.start();
      router.replace(SIGNUP_NEXT_PATH);
    } catch (error) {
      if (!(error instanceof LoginError)) {
        setSubmitError("No pudimos crear tu cuenta. Revisa tu conexión e inténtalo de nuevo.");
        return;
      }
      switch (error.code) {
        case API_ERROR_CODES.nitTaken:
        case API_ERROR_CODES.nitInvalid:
          setNitError(messageForCode(error.code));
          setStep(1);
          return;
        case API_ERROR_CODES.emailInUse:
        case API_ERROR_CODES.emailDisposable:
          form.setError("email", { type: "server", message: messageForCode(error.code) });
          return;
        default:
          if (error.status === 429) {
            const wait = error.retryAfterSeconds ? ` Reintenta en ${error.retryAfterSeconds} s.` : "";
            setSubmitError(`Demasiados intentos.${wait}`);
            return;
          }
          setSubmitError(messageForCode(error.code, error.message || "No pudimos crear tu cuenta. Inténtalo de nuevo."));
      }
    }
  }

  if (!ready) return <SignupSkeleton />;

  const copy = STEP_COPY[step];

  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 pb-20 pt-2">
      {isAuthenticated ? (
        <p role="status" className="border-border bg-background/70 mb-6 rounded-xl border px-4 py-3 text-sm">
          Ya tienes una sesión abierta.{" "}
          <Link href="/dashboard" className="text-brand font-medium hover:underline">
            Ir a mi panel
          </Link>{" "}
          o continúa para crear otra empresa.
        </p>
      ) : null}

      <div className="mx-auto mb-7 max-w-[520px]">
        <StepIndicator steps={SIGNUP_STEP_LABELS} current={step} onStepClick={goTo} ariaLabel="Progreso del registro" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
        <section
          aria-label={`Paso ${step + 1} de ${SIGNUP_STEPS.length}: ${SIGNUP_STEP_LABELS[step]}`}
          className="bg-card border-border rounded-2xl border p-7 shadow-float sm:p-8"
        >
          <h1 className="font-heading text-[1.625rem] leading-tight font-bold tracking-tight">{copy.title}</h1>
          <p className="text-muted-foreground mt-2 max-w-[44rem] text-sm leading-relaxed">{copy.lead}</p>

          <div className="mt-6">
            {step === 0 ? <OfferStep selection={draft.offer} onChange={setOffer} onNext={() => goTo(1)} /> : null}
            {step === 1 ? (
              <CompanyStep
                defaultValues={companyDraftToValues(draft.company)}
                nitError={nitError}
                onBack={(values: CompanyStepValues) => {
                  setDraft((current) => ({ ...current, company: values }));
                  setStep(0);
                }}
                onNext={(values) => {
                  setDraft((current) => ({ ...current, company: values }));
                  setNitError(null);
                  setStep(2);
                }}
              />
            ) : null}
            {step === 2 ? (
              <AccountStep
                defaultValues={accountDraftToValues(draft.account)}
                submitError={submitError}
                onBack={(values) => {
                  setDraft((current) => ({ ...current, account: values }));
                  setStep(1);
                }}
                onSubmit={submitAccount}
                onCaptcha={(token) => {
                  captchaRef.current = token;
                }}
                onHoneypot={(value) => {
                  honeypotRef.current = value;
                }}
              />
            ) : null}
          </div>
        </section>

        <SignupSummaryRail selection={draft.offer} />
      </div>
    </div>
  );
}

/** Esqueleto estructural del funnel (también lo usa `loading.tsx`). */
export function SignupSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1120px] animate-pulse px-6 pb-20 pt-2" aria-busy="true" aria-label="Cargando el registro">
      <div className="bg-muted mx-auto mb-7 h-8 max-w-[520px] rounded-full" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div className="bg-muted h-[28rem] rounded-2xl" />
        <div className="bg-muted h-80 rounded-2xl" />
      </div>
    </div>
  );
}
