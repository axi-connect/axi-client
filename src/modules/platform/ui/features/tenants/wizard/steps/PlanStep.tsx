"use client";

/**
 * Paso 3 · Plan (opcional). Radio-cards de los planes activos
 * (`PlanOptionCard` compartida con «Cambiar plan» del detalle); los
 * `tier: enterprise` van deshabilitados con explicación (el backend responde
 * 409 `tenant_db/not_active` en el alta — se previene por diseño, spec D12).
 */
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { usePlansQuery } from "../../../../../infrastructure/api/hooks/use-plans";
import { ProblemAlert } from "../../../../components/ProblemAlert";
import { PlanOptionCard } from "../../../plans/PlanOptionCard";

type PlanStepProps = {
  /** `plan_code` elegido; `null` = sin plan (se asigna después). */
  selected: string | null;
  onSelect: (planCode: string | null) => void;
  onBack: () => void;
  onNext: () => void;
};

export function PlanStep({ selected, onSelect, onBack, onNext }: PlanStepProps) {
  const { data, isPending, isError, error, refetch } = usePlansQuery();
  const plans = (data?.data ?? []).filter((plan) => plan.is_active);

  return (
    <div className="space-y-5">
      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      ) : isError ? (
        // El plan es opcional: el error no bloquea el alta.
        <ProblemAlert error={error} onRetry={() => void refetch()} />
      ) : (
        <div role="radiogroup" aria-label="Plan comercial" className="grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => (
            <PlanOptionCard
              key={plan.id}
              plan={plan}
              checked={selected === plan.code}
              onSelect={() => onSelect(plan.code)}
              disabled={plan.tier === "enterprise"}
              disabledReason="Enterprise requiere una base de datos dedicada activa; asígnalo después del alta desde el detalle del tenant."
            />
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={selected === null}
            onClick={() => onSelect(null)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border border-dashed p-4 text-left transition-colors",
              selected === null ? "border-primary bg-accent" : "border-border hover:bg-accent/50",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-4 items-center justify-center rounded-full border",
                selected === null ? "border-primary" : "border-input",
              )}
            >
              {selected === null && <span className="size-2 rounded-full bg-primary" />}
            </span>
            <span>
              <span className="block font-medium">Sin plan por ahora</span>
              <span className="block text-sm text-muted-foreground">
                Se asigna después desde el detalle (por defecto aplica «sbs»).
              </span>
            </span>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Atrás
        </Button>
        <Button type="button" onClick={onNext}>
          Siguiente
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
