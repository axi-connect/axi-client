"use client";

/**
 * Paso 1 · Objetivo: tenant (suspendidos deshabilitados — arrancar contra
 * uno daría 409 `tenant_not_eligible`) + agente ACTIVO del tenant. Los
 * agentes salen de `GET /platform/tenants/{id}/agents` (upgrade quality F1):
 * antes se filtraba `agents-health?days=1` en cliente y un agente sin tráfico
 * reciente no aparecía. Los clones [QA-mock] vienen excluidos del payload.
 */
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { TenantSelect } from "../../../../components/TenantSelect";
import { AgentSelect } from "../../shared/AgentSelect";

type TargetStepProps = {
  companyId: string | null;
  agentId: string | null;
  onChange: (target: { companyId: string | null; agentId: string | null }) => void;
  onNext: () => void;
};

export function TargetStep({ companyId, agentId, onChange, onNext }: TargetStepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="run-tenant">Tenant *</Label>
        <TenantSelect
          value={companyId ?? ""}
          onValueChange={(value) => onChange({ companyId: value, agentId: null })}
          disableSuspended
          className="w-full"
          ariaLabel="Tenant objetivo"
          placeholder="Elige el tenant a probar"
        />
        <p className="text-xs text-muted-foreground">
          Los tenants suspendidos no admiten ejecuciones de calidad.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="run-agent">Agente objetivo (QA y estrés)</Label>
        <AgentSelect
          companyId={companyId}
          value={agentId}
          onValueChange={(value) => onChange({ companyId, agentId: value })}
          placeholder="Elige el agente a evaluar"
        />
        <p className="text-xs text-muted-foreground">
          Solo agentes activos; los clones internos de QA quedan excluidos. Un probe (capacidad contra dataset) no
          necesita agente: puedes seguir sin elegirlo.
        </p>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button onClick={onNext} disabled={!companyId}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
