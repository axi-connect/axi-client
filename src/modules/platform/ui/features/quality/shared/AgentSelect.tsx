"use client";

/**
 * Selector de agente IA de un tenant (`GET /platform/tenants/{id}/agents`).
 * Lo comparten el simulacro y el wizard de ejecuciones: solo agentes activos,
 * los clones internos de QA ya vienen excluidos. Marca el predeterminado de
 * algún canal real para orientar al operador.
 */
import { Bot } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useTenantAgentsQuery } from "../../../../infrastructure/api/hooks/use-tenant-agents";

type AgentSelectProps = {
  companyId: string | null;
  value: string | null;
  onValueChange: (agentId: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
};

export function AgentSelect({
  companyId,
  value,
  onValueChange,
  ariaLabel = "Agente objetivo",
  placeholder = "Elige el agente",
  className,
}: AgentSelectProps) {
  const agentsQuery = useTenantAgentsQuery(companyId, "active");

  if (!companyId) {
    return (
      <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
        Elige primero el tenant.
      </p>
    );
  }
  if (agentsQuery.isPending) return <Skeleton className="h-9 w-full rounded-xl" />;
  const agents = agentsQuery.data?.data ?? [];
  if (agents.length === 0) {
    return (
      <Alert variant="warning">
        <Bot aria-hidden="true" />
        <AlertDescription>
          Este tenant no tiene agentes activos: activa uno antes de probarlo.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Select value={value ?? ""} onValueChange={onValueChange}>
      <SelectTrigger className={className ?? "w-full"} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.name}
            <span className="text-muted-foreground">
              {" "}· {agent.model}
              {agent.is_default ? " · predeterminado" : ""}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
