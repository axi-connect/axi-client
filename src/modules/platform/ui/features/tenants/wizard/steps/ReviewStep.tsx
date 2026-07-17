"use client";

/**
 * Paso 4 · Revisión: resumen por sección con "Editar" (vuelve al paso
 * exacto) y el submit real. Los errores del POST se muestran aquí
 * (`identities/nit_taken` regresa solo al paso 1 desde el orquestador).
 */
import { ArrowLeft, LoaderCircle, PencilLine } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { countryByCode } from "../../../../../domain/catalogs";
import { ProblemAlert } from "../../../../components/ProblemAlert";
import type { CompanyStepValues } from "./company-step.config";
import type { OwnerStepValues } from "./owner-step.config";

type ReviewStepProps = {
  company: CompanyStepValues;
  owner: OwnerStepValues;
  planCode: string | null;
  planName: string | null;
  submitError: unknown;
  pending: boolean;
  onEdit: (step: number) => void;
  onBack: () => void;
  onSubmit: () => void;
};

function ReviewRow({ label, step, onEdit, children }: {
  label: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-background p-4">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(step)}>
        <PencilLine aria-hidden="true" />
        Editar
      </Button>
    </div>
  );
}

export function ReviewStep({
  company,
  owner,
  planCode,
  planName,
  submitError,
  pending,
  onEdit,
  onBack,
  onSubmit,
}: ReviewStepProps) {
  const country = countryByCode(company.country_code);

  return (
    <div className="space-y-4">
      <ReviewRow label="Empresa" step={0} onEdit={onEdit}>
        <p className="font-medium">{company.name}</p>
        <p className="text-muted-foreground">
          NIT <span className="font-mono tabular-nums">{company.nit}</span> · {country?.name ?? company.country_code} ·{" "}
          {company.currency} · {company.status === "trial" ? "Trial" : "Activo"}
          {company.city ? ` · ${company.city}` : ""}
        </p>
      </ReviewRow>

      <ReviewRow label="Propietario" step={1} onEdit={onEdit}>
        <p className="font-medium">{owner.name}</p>
        <p className="text-muted-foreground">
          {owner.email} · contraseña <span className="font-mono">••••••••</span>
        </p>
      </ReviewRow>

      <ReviewRow label="Plan" step={2} onEdit={onEdit}>
        <p className="font-medium">{planCode ? planName ?? planCode : "Sin plan (se asigna después)"}</p>
      </ReviewRow>

      {submitError != null && <ProblemAlert error={submitError} />}

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack} disabled={pending}>
          <ArrowLeft aria-hidden="true" />
          Atrás
        </Button>
        <Button type="button" onClick={onSubmit} disabled={pending}>
          {pending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
          {pending ? "Creando…" : "Crear tenant"}
        </Button>
      </div>
    </div>
  );
}
