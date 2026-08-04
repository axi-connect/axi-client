"use client";

/**
 * Wizard "Nueva ejecución" (3 pasos: objetivo → configuración → revisión).
 * El borrador vive en estado local (el ReLoginModal es un overlay: un
 * re-login a mitad del alta no pierde nada, spec D1/D6). POST → 202 {id}
 * → toast y vuelta a la lista (F4 lo cambia por el detalle en vivo).
 *
 * Errores de negocio del POST (RFC 7807, SIEMPRE por `code`):
 *  · 409 run_already_active → alerta con CTA a la lista.
 *  · 409 tenant_not_eligible → mensaje según details.reason.
 *  · 422 spend_cap_exceeded → cifras del estimado; `no_pricing` sugiere mock.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import {
  describeSpendCapExceeded,
  describeTenantNotEligible,
} from "../../../../../domain/quality-runs";
import { useAgentsHealthQuery } from "../../../../../infrastructure/api/hooks/use-analytics";
import { useCreateRun } from "../../../../../infrastructure/api/hooks/use-quality-runs";
import { useSuitesQuery } from "../../../../../infrastructure/api/hooks/use-quality-suites";
import { useTenantsQuery } from "../../../../../infrastructure/api/hooks/use-tenants";
import { StepIndicator } from "../../../../components/StepIndicator";
import { ConfigStep } from "./ConfigStep";
import { ReviewStep, type SubmitErrorInfo } from "./ReviewStep";
import { buildCreateRunDTO, defaultRunConfigValues, type RunConfigValues } from "./run-config";
import { TargetStep } from "./TargetStep";

const STEPS = ["Objetivo", "Configuración", "Revisión"] as const;

/** Extrae el `details` no tipado del problem (RFC 7807 extendido). */
function problemDetails(error: unknown): unknown {
  if (!isHttpError(error) || !error.problem) return undefined;
  return (error.problem as unknown as Record<string, unknown>).details;
}

export function RunWizard() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const createRun = useCreateRun();
  const tenantsQuery = useTenantsQuery();
  const agentsQuery = useAgentsHealthQuery(1);
  const suitesQuery = useSuitesQuery({ status: "active", page: 1, pageSize: 100 });

  const [step, setStep] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [config, setConfig] = useState<RunConfigValues>(defaultRunConfigValues);
  const [submitError, setSubmitError] = useState<SubmitErrorInfo>(null);

  const companyName = useMemo(
    () => tenantsQuery.data?.data.find((tenant) => tenant.id === companyId)?.name ?? "—",
    [tenantsQuery.data, companyId],
  );
  const agentName = useMemo(
    () => agentsQuery.data?.agents.find((agent) => agent.agent_id === agentId)?.agent_name ?? "—",
    [agentsQuery.data, agentId],
  );
  const suiteName = useMemo(
    () => suitesQuery.data?.data.find((suite) => suite.id === config.suiteId)?.name ?? null,
    [suitesQuery.data, config.suiteId],
  );

  async function submit() {
    if (!companyId || !agentId) return;
    setSubmitError(null);
    try {
      await createRun.mutateAsync(buildCreateRunDTO({ companyId, agentId, config }));
      showAlert({
        tone: "success",
        title: "Ejecución creada",
        description: `Quedó en cola contra ${companyName}; síguela desde la lista.`,
        autoCloseMs: 5000,
      });
      router.replace("/platform/quality/runs");
    } catch (error) {
      const details = problemDetails(error);
      if (isHttpError(error) && error.is("quality/tenant_not_eligible")) {
        setSubmitError({ message: describeTenantNotEligible(details), suggestMock: false, alreadyActive: false });
        return;
      }
      if (isHttpError(error) && error.is("quality/spend_cap_exceeded")) {
        const reason =
          typeof details === "object" && details !== null
            ? (details as Record<string, unknown>).reason
            : undefined;
        setSubmitError({
          message: describeSpendCapExceeded(details),
          suggestMock: reason === "no_pricing",
          alreadyActive: false,
        });
        return;
      }
      if (isHttpError(error) && error.is("quality/run_already_active")) {
        setSubmitError({ message: errorMessage(error), suggestMock: false, alreadyActive: true });
        return;
      }
      setSubmitError({ message: errorMessage(error), suggestMock: false, alreadyActive: false });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Nueva ejecución</h2>
        <p className="text-sm text-muted-foreground">
          Objetivo, configuración y revisión — nada corre hasta que confirmes.
        </p>
      </header>

      <StepIndicator steps={STEPS} current={step} onStepClick={setStep} ariaLabel="Progreso de la ejecución" />

      <section
        aria-label={`Paso ${step + 1} de ${STEPS.length}: ${STEPS[step]}`}
        className="rounded-2xl border border-border bg-background p-6"
      >
        {step === 0 && (
          <TargetStep
            companyId={companyId}
            agentId={agentId}
            onChange={(target) => {
              setCompanyId(target.companyId);
              setAgentId(target.agentId);
            }}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <ConfigStep
            values={config}
            onChange={setConfig}
            onBack={() => setStep(0)}
            onNext={() => {
              setSubmitError(null);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <ReviewStep
            companyName={companyName}
            agentName={agentName}
            values={config}
            suiteName={suiteName}
            submitError={submitError}
            pending={createRun.isPending}
            onBack={() => setStep(1)}
            onSubmit={() => void submit()}
            onUseMock={() => {
              setConfig((current) => ({ ...current, aiMode: "mock" }));
              setSubmitError(null);
            }}
          />
        )}
      </section>
    </div>
  );
}
