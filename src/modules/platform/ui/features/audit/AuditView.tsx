"use client";

/**
 * Visor de auditoría — UNA vista para dos superficies (spec §5.7):
 * `/platform/audit` (global) y el tab del tenant (`companyId` fijado,
 * selector oculto). Sin paginación server: label honesto "últimos N".
 * Filtros = parámetros del endpoint; acción con Select agrupado + entrada
 * libre para las ~70 acciones de dominio (`dominio.verbo`).
 */
import { useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { TableSkeleton } from "@/shared/components/features/loading";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  ACTION_GROUPS,
  AUDIT_LIMITS,
  DEFAULT_AUDIT_LIMIT,
} from "../../../domain/audit";
import { useAuditLogsQuery } from "../../../infrastructure/api/hooks/use-audit";
import { useTenantsQuery } from "../../../infrastructure/api/hooks/use-tenants";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";
import { ALL_TENANTS, TenantSelect } from "../../components/TenantSelect";
import { AuditLogRow } from "./AuditLogRow";

const ALL = ALL_TENANTS;
const CUSTOM = "custom";

type AuditViewProps = {
  /** Fija el tenant (tab del detalle) y oculta su selector. */
  companyId?: string;
  lockTenant?: boolean;
};

export function AuditView({ companyId, lockTenant = false }: AuditViewProps) {
  const [tenantFilter, setTenantFilter] = useState<string>(ALL);
  const [actionChoice, setActionChoice] = useState<string>(ALL);
  const [customDraft, setCustomDraft] = useState("");
  const [customAction, setCustomAction] = useState("");
  const [limit, setLimit] = useState(DEFAULT_AUDIT_LIMIT);

  const effectiveCompanyId = lockTenant ? companyId : tenantFilter === ALL ? undefined : tenantFilter;
  const effectiveAction =
    actionChoice === ALL ? undefined : actionChoice === CUSTOM ? customAction || undefined : actionChoice;

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useAuditLogsQuery({
    companyId: effectiveCompanyId,
    action: effectiveAction,
    limit,
  });
  const tenantsQuery = useTenantsQuery();

  const tenantNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const tenant of tenantsQuery.data?.data ?? []) map.set(tenant.id, tenant.name);
    return map;
  }, [tenantsQuery.data]);

  const logs = data?.data ?? [];
  const hasFilters = (!lockTenant && tenantFilter !== ALL) || actionChoice !== ALL || limit !== DEFAULT_AUDIT_LIMIT;

  function commitCustomAction() {
    setCustomAction(customDraft.trim());
  }

  function clearFilters() {
    setTenantFilter(ALL);
    setActionChoice(ALL);
    setCustomDraft("");
    setCustomAction("");
    setLimit(DEFAULT_AUDIT_LIMIT);
  }

  return (
    <div className="space-y-4">
      <header className={cn(lockTenant ? "" : "space-y-1")}>
        {!lockTenant && <h1 className="text-3xl font-semibold tracking-tight">Auditoría</h1>}
        <p className="text-sm text-muted-foreground">
          Últimos {limit} eventos de {lockTenant ? "este tenant" : "la plataforma"}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {!lockTenant && (
          <TenantSelect
            value={tenantFilter}
            onValueChange={setTenantFilter}
            allowAll
            ariaLabel="Filtrar por tenant"
          />
        )}

        <Select value={actionChoice} onValueChange={setActionChoice}>
          <SelectTrigger className="w-64" aria-label="Filtrar por acción">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las acciones</SelectItem>
            {ACTION_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    <span className="font-mono text-xs">{action}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            <SelectGroup>
              <SelectLabel>Dominio</SelectLabel>
              <SelectItem value={CUSTOM}>Acción personalizada…</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {actionChoice === CUSTOM && (
          <Input
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            onBlur={commitCustomAction}
            onKeyDown={(e) => { if (e.key === "Enter") commitCustomAction(); }}
            placeholder="orders.created"
            aria-label="Acción personalizada (dominio.verbo)"
            className="w-52 font-mono text-xs"
          />
        )}

        <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
          <SelectTrigger className="w-32" aria-label="Cantidad de eventos">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIT_LIMITS.map((option) => (
              <SelectItem key={option} value={String(option)}>Últimos {option}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpiar
          </Button>
        )}
      </div>

      {isPending ? (
        <TableSkeleton rows={8} showHeader={false} />
      ) : isError ? (
        <ProblemAlert error={error} onRetry={() => void refetch()} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Sin eventos"
          description={
            hasFilters
              ? "Ningún evento coincide con los filtros. Amplía la búsqueda."
              : "Todavía no hay actividad registrada."
          }
        />
      ) : (
        <ul
          className={cn(
            "rounded-2xl border border-border bg-background transition-opacity",
            isPlaceholderData && "opacity-60",
          )}
          aria-busy={isPlaceholderData}
        >
          {logs.map((log) => (
            <AuditLogRow
              key={log.id}
              log={log}
              showTenant={!lockTenant}
              tenantName={log.company_id ? tenantNames.get(log.company_id) ?? null : null}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
