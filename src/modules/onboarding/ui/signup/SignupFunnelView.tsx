"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { UseFormReturn } from "react-hook-form";

import { API_ERROR_CODES } from "@/core/api/problem";
import { track } from "@/core/analytics/track";
import { messageForCode } from "@/core/lib/error-messages";
import { LoginError } from "@/core/providers/auth-provider";
import { useSplashOptional } from "@/core/providers/splash-provider";
import { fade, spring } from "@/core/styles/motion";
import { useAuth, useSession } from "@/shared/auth/auth.hooks";
import {
  EMPTY_SIGNUP_DRAFT,
  SIGNUP_NEXT_PATH,
  SIGNUP_STEPS,
  blockerForSignupStep,
  parseOfferQuery,
  reachableSignupStep,
  toSignupPayload,
  type OfferSelection,
  type SignupDraft,
} from "@/modules/onboarding/domain/signup-draft";
import {
  clearSignupDraft,
  readSignupDraft,
  writeSignupDraft,
} from "@/modules/onboarding/infrastructure/storage/signup-draft.storage";
import { CompanyIdentityStep } from "@/modules/onboarding/ui/signup/CompanyIdentityStep";
import { CompanyLocationStep } from "@/modules/onboarding/ui/signup/CompanyLocationStep";
import { OfferStep } from "@/modules/onboarding/ui/signup/OfferStep";
import { OwnerStep } from "@/modules/onboarding/ui/signup/OwnerStep";
import { PasswordStep } from "@/modules/onboarding/ui/signup/PasswordStep";
import { SignupProgressDots, SignupScreen } from "@/modules/onboarding/ui/signup/SignupScreen";
import { SignupRoute } from "@/modules/onboarding/ui/signup/SignupRoute";
import { SIGNUP_STEP_ICONS } from "@/modules/onboarding/ui/signup/signup-field.styles";
import { accountDraftToValues, type PasswordValues } from "@/modules/onboarding/ui/signup/config/account-step.config";
import { companyDraftToValues } from "@/modules/onboarding/ui/signup/config/company-step.config";

/** La pregunta de cada pantalla. El `h1` ES la etiqueta visible del control. */
const STEP_COPY = [
  {
    title: "¿Cómo quieres empezar?",
    lead: "Todo arranca con 7 días de prueba sin tarjeta. Cambia de opinión cuando quieras: la prueba es la misma.",
  },
  {
    title: "¿Cómo se llama tu empresa?",
    lead: "Lo justo para crear tu cuenta. El resto lo configuras después, con guía.",
  },
  {
    title: "¿Dónde opera tu negocio?",
    lead: "La ciudad ajusta ejemplos, zonas de entrega y agenda. La moneda y la zona horaria se ajustan solas.",
  },
  {
    title: "¿Y tú, cómo te llamas?",
    lead: "Serás la persona propietaria de la cuenta: podrás invitar a tu equipo y asignar permisos después.",
  },
  {
    title: "Crea tu contraseña",
    lead: "Un último paso y entras directo a configurar tu empresa.",
  },
] as const;

const ROUTE_STOPS = SIGNUP_STEPS.map((step) => ({ code: step.code, label: step.label, icon: SIGNUP_STEP_ICONS[step.code] }));

/** Objetivo de entrada de cada pantalla. Constante para reconocerlo en `onAnimationComplete`. */
const ENTER = { opacity: 1, y: 0, transition: spring.soft } as const;
const EXIT = { opacity: 0, y: -18, transition: fade.fast } as const;

/** Solo con puntero fino: en móvil el foco automático levanta el teclado sin que nadie lo pida. */
function hasFinePointer(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Orquestador de `/comenzar` (mockup v3 «Flow», aprobado 2026-09-05): una
 * pregunta por pantalla sobre el campo de marca, con la ruta al pie.
 *
 * El borrador vive en estado local y se refleja en `sessionStorage` sin la
 * contraseña. La URL preselecciona la oferta (`?plan=`, `?modulo=`) y gana
 * sobre lo guardado: quien llega desde un CTA nuevo quiere ESA oferta.
 *
 * Errores del alta, por `code`: NIT repetido o inválido → vuelve a «Empresa»
 * con el error en el campo; correo en uso o desechable → vuelve a «Tú» con el
 * error en el correo; el resto (captcha, rate-limit, red) → aviso sobre el
 * botón de la última pantalla.
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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const captchaRef = useRef("");
  const honeypotRef = useRef("");
  const initializedRef = useRef(false);
  const screenRef = useRef<HTMLElement | null>(null);

  // Al terminar de ENTRAR una pantalla, el primer control recibe el foco: la
  // pregunta ya se leyó y lo siguiente es responderla. En Oferta no hay input
  // y no pasa nada; en la salida de la pantalla anterior tampoco (se compara
  // con el objetivo de entrada, no con el de salida).
  const focusFirstControl = useCallback((definition: unknown) => {
    if (definition !== ENTER || !hasFinePointer()) return;
    const control = screenRef.current?.querySelector<HTMLElement>('input:not([type="hidden"]):not([tabindex="-1"]), select, [role="combobox"]');
    control?.focus({ preventScroll: true });
  }, []);

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
    const initial: SignupDraft = { offer, company, account: null };
    setDraft(initial);
    // Con oferta en la URL se entra directo a Empresa; si no, al paso guardado
    // más lejano que las respuestas guardadas permitan.
    setStep(fromQuery.selection ? reachableSignupStep(1, initial) : reachableSignupStep(stored?.step ?? 0, initial));
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

  async function submitAccount(values: PasswordValues, form: UseFormReturn<PasswordValues>) {
    setSubmitError(null);
    const nextDraft: SignupDraft = {
      ...draft,
      account: { ...accountDraftToValues(draft.account), ...values },
    };
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
          form.clearErrors();
          setEmailError(messageForCode(error.code));
          setStep(3);
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
  const companyValues = companyDraftToValues(draft.company);
  const accountValues = accountDraftToValues(draft.account);

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex flex-col items-center gap-3 px-6 pt-1">
        <SignupProgressDots total={SIGNUP_STEPS.length} current={step} />
        {isAuthenticated ? (
          <p role="status" className="sf-glass rounded-full px-4 py-2 text-[13px]">
            Ya tienes una sesión abierta.{" "}
            <Link href="/dashboard" className="text-foreground font-semibold hover:underline">
              Ir a mi panel
            </Link>{" "}
            o continúa para crear otra empresa.
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 items-center justify-center px-6 pt-6 pb-10" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            className="w-full"
            initial={{ opacity: 0, y: 22 }}
            animate={ENTER}
            exit={EXIT}
            onAnimationComplete={focusFirstControl}
          >
            <section ref={screenRef} aria-label={`Paso ${step + 1} de ${SIGNUP_STEPS.length}: ${SIGNUP_STEPS[step].label}`}>
              <SignupScreen title={copy.title} lead={copy.lead}>
                {step === 0 ? <OfferStep selection={draft.offer} onChange={setOffer} onNext={() => goTo(1)} /> : null}
                {step === 1 ? (
                  <CompanyIdentityStep
                    defaultValues={companyValues}
                    nitError={nitError}
                    onBack={(values) => {
                      setDraft((current) => ({ ...current, company: { ...companyDraftToValues(current.company), ...values } }));
                      setStep(0);
                    }}
                    onNext={(values) => {
                      setDraft((current) => ({ ...current, company: { ...companyDraftToValues(current.company), ...values } }));
                      setNitError(null);
                      setStep(2);
                    }}
                  />
                ) : null}
                {step === 2 ? (
                  <CompanyLocationStep
                    defaultValues={companyValues}
                    onBack={(values) => {
                      setDraft((current) => ({ ...current, company: { ...companyDraftToValues(current.company), ...values } }));
                      setStep(1);
                    }}
                    onNext={(values) => {
                      setDraft((current) => ({ ...current, company: { ...companyDraftToValues(current.company), ...values } }));
                      setStep(3);
                    }}
                  />
                ) : null}
                {step === 3 ? (
                  <OwnerStep
                    defaultValues={accountValues}
                    emailError={emailError}
                    onBack={(values) => {
                      setDraft((current) => ({ ...current, account: { ...accountDraftToValues(current.account), ...values } }));
                      setStep(2);
                    }}
                    onNext={(values) => {
                      setDraft((current) => ({ ...current, account: { ...accountDraftToValues(current.account), ...values } }));
                      setEmailError(null);
                      setStep(4);
                    }}
                  />
                ) : null}
                {step === 4 ? (
                  <PasswordStep
                    selection={draft.offer}
                    defaultValues={accountValues}
                    submitError={submitError}
                    onBack={(values) => {
                      setDraft((current) => ({ ...current, account: { ...accountDraftToValues(current.account), ...values } }));
                      setStep(3);
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
              </SignupScreen>
            </section>
          </motion.div>
        </AnimatePresence>
      </div>

      <SignupRoute stops={ROUTE_STOPS} current={step} onJump={goTo} />
    </div>
  );
}

/** Esqueleto estructural del funnel (también lo usa `loading.tsx`): la pregunta y su control, en cristal. */
export function SignupSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col items-center px-6 pt-1" aria-busy="true" aria-label="Cargando el registro">
      <div className="flex items-center gap-[7px]">
        {Array.from({ length: SIGNUP_STEPS.length }, (_, index) => (
          <i key={index} className="bg-foreground/35 block size-1.5 rounded-full" />
        ))}
      </div>
      <div className="flex w-full max-w-[440px] flex-1 flex-col items-center justify-center gap-4 py-6">
        <div className="sf-glass h-14 w-3/4 animate-pulse rounded-[14px]" />
        <div className="sf-glass h-4 w-1/2 animate-pulse rounded-full" />
        <div className="sf-glass mt-6 h-14 w-full animate-pulse rounded-[14px]" />
        <div className="sf-glass h-14 w-full animate-pulse rounded-[14px]" />
      </div>
      <div className="h-[280px] w-full shrink-0" />
    </div>
  );
}
