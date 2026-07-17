"use client";

/**
 * Wizard de alta de tenant (3 pasos + revisión). El borrador vive en estado
 * local — el ReLoginModal es un overlay, no desmonta la vista, así que un
 * re-login a mitad del alta no pierde nada (spec D1/D6).
 *
 * Errores del POST: `identities/nit_taken` → paso 1 con error inline en NIT;
 * el resto se muestra en la revisión (`ProblemAlert`).
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAlert } from "@/core/providers/alert-provider";
import { isHttpError } from "@/core/api/problem";
import type { CreateTenantDTO } from "../../../../domain/tenant";
import { PENDING_CREDENTIALS_KEY, type PendingOwnerCredentials } from "../../../../domain/tenant";
import { useCreateTenant } from "../../../../infrastructure/api/hooks/use-tenants";
import { usePlansQuery } from "../../../../infrastructure/api/hooks/use-plans";
import { WizardStepper } from "./WizardStepper";
import { CompanyStep } from "./steps/CompanyStep";
import { OwnerStep } from "./steps/OwnerStep";
import { PlanStep } from "./steps/PlanStep";
import { ReviewStep } from "./steps/ReviewStep";
import { defaultCompanyStepValues, type CompanyStepValues } from "./steps/company-step.config";
import { defaultOwnerStepValues, type OwnerStepValues } from "./steps/owner-step.config";

const STEPS = ["Empresa", "Propietario", "Plan", "Revisión"] as const;

export function TenantWizard() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const createTenant = useCreateTenant();
  const { data: plansData } = usePlansQuery();

  const [step, setStep] = useState(0);
  const [company, setCompany] = useState<CompanyStepValues>(defaultCompanyStepValues);
  const [owner, setOwner] = useState<OwnerStepValues>(defaultOwnerStepValues);
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [nitError, setNitError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const planName = useMemo(
    () => plansData?.data.find((plan) => plan.code === planCode)?.name ?? null,
    [plansData, planCode],
  );

  async function submit() {
    setSubmitError(null);
    const body: CreateTenantDTO = {
      company: {
        name: company.name,
        nit: company.nit,
        country_code: company.country_code,
        currency: company.currency,
        status: company.status,
        // Opcionales: solo viajan si tienen valor (wire limpio).
        ...(company.city ? { city: company.city } : {}),
        ...(company.industry ? { industry: company.industry } : {}),
        ...(company.timezone ? { timezone: company.timezone } : {}),
      },
      owner: { name: owner.name, email: owner.email, password: owner.password },
      ...(planCode ? { plan_code: planCode } : {}),
    };

    try {
      const created = await createTenant.mutateAsync(body);
      // Credenciales efímeras para el banner del detalle (se leen UNA vez).
      const credentials: PendingOwnerCredentials = {
        tenant_id: created.id,
        email: owner.email,
        password: owner.password,
      };
      window.sessionStorage.setItem(PENDING_CREDENTIALS_KEY, JSON.stringify(credentials));
      showAlert({
        tone: "success",
        title: "Tenant creado",
        description: `${company.name} ya está en la plataforma.`,
        autoCloseMs: 5000,
      });
      router.replace(`/platform/tenants/${created.id}`);
    } catch (error) {
      if (isHttpError(error) && error.is("identities/nit_taken")) {
        setNitError("Este NIT ya está registrado en la plataforma.");
        setStep(0);
        return;
      }
      setSubmitError(error);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Nuevo tenant</h1>
        <p className="text-sm text-muted-foreground">
          Empresa, propietario y plan — revisas todo antes de crear.
        </p>
      </header>

      <WizardStepper steps={STEPS} current={step} onStepClick={setStep} ariaLabel="Progreso del alta" />

      <section
        aria-label={`Paso ${step + 1} de ${STEPS.length}: ${STEPS[step]}`}
        className="rounded-2xl border border-border bg-background p-6"
      >
        {step === 0 && (
          <CompanyStep
            defaultValues={company}
            nitError={nitError}
            onNext={(values) => {
              setCompany(values);
              setNitError(null);
              setStep(1);
            }}
          />
        )}
        {step === 1 && (
          <OwnerStep
            defaultValues={owner}
            onBack={(draft) => {
              setOwner(draft);
              setStep(0);
            }}
            onNext={(values) => {
              setOwner(values);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <PlanStep
            selected={planCode}
            onSelect={setPlanCode}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <ReviewStep
            company={company}
            owner={owner}
            planCode={planCode}
            planName={planName}
            submitError={submitError}
            pending={createTenant.isPending}
            onEdit={setStep}
            onBack={() => setStep(2)}
            onSubmit={() => void submit()}
          />
        )}
      </section>
    </div>
  );
}
