"use client";

/**
 * Paso 1 · Objetivo: tenant (suspendidos deshabilitados — arrancar contra
 * uno daría 409 `tenant_not_eligible`) + agente ACTIVO del tenant. Los
 * agentes salen de `agents-health?days=1` filtrados en cliente: no existe
 * endpoint platform de agentes por tenant (gap documentado en el plan;
 * mejora futura `GET /platform/tenants/{id}/agents`). Los clones [QA-mock]
 * ya vienen excluidos del payload.
 */
import { useMemo } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useAgentsHealthQuery } from "../../../../../infrastructure/api/hooks/use-analytics";
import { TenantSelect } from "../../../../components/TenantSelect";

type TargetStepProps = {
  companyId: string | null;
  agentId: string | null;
  onChange: (target: { companyId: string | null; agentId: string | null }) => void;
  onNext: () => void;
};

export function TargetStep({ companyId, agentId, onChange, onNext }: TargetStepProps) {
  const agentsQuery = useAgentsHealthQuery(1);

  const agents = useMemo(() => {
    if (!companyId) return [];
    return (agentsQuery.data?.agents ?? [])
      .filter((agent) => agent.company_id === companyId && agent.agent_status === "active")
      .sort((a, b) => a.agent_name.localeCompare(b.agent_name));
  }, [agentsQuery.data, companyId]);

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
        <Label htmlFor="run-agent">Agente objetivo *</Label>
        {!companyId ? (
          <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
            Elige primero el tenant.
          </p>
        ) : agentsQuery.isPending ? (
          <Skeleton className="h-9 w-full rounded-xl" />
        ) : agents.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
            <Bot aria-hidden="true" className="size-4 shrink-0" />
            Este tenant no tiene agentes activos: activa uno antes de lanzar la ejecución.
          </p>
        ) : (
          <Select value={agentId ?? ""} onValueChange={(value) => onChange({ companyId, agentId: value })}>
            <SelectTrigger className="w-full" aria-label="Agente objetivo">
              <SelectValue placeholder="Elige el agente a evaluar" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.agent_id} value={agent.agent_id}>
                  {agent.agent_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">
          Solo agentes activos; los clones internos de QA quedan excluidos.
        </p>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button onClick={onNext} disabled={!companyId || !agentId}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
