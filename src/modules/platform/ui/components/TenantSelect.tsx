"use client";

/**
 * Selector de tenant reutilizable de la consola (Auditoría, Calidad…).
 * `GET /platform/tenants` no pagina ni busca en server: la lista llega
 * completa y se renderiza tal cual (orden `created_at asc` del backend).
 *
 * `allowAll` añade la opción "Todos los tenants" (value `ALL_TENANTS`).
 * `disableSuspended` inhabilita los suspendidos — p.ej. el wizard de
 * ejecución de calidad, donde arrancar contra un suspendido daría
 * 409 `quality/tenant_not_eligible` (prevenir por diseño, spec D12).
 */
import { cn } from "@/core/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useTenantsQuery } from "../../infrastructure/api/hooks/use-tenants";

/** Valor reservado de la opción "Todos los tenants". */
export const ALL_TENANTS = "all";

type TenantSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  /** Muestra la opción "Todos los tenants" (filtros de listados). */
  allowAll?: boolean;
  /** Inhabilita los tenants suspendidos (wizards que exigen elegibilidad). */
  disableSuspended?: boolean;
  /** Clases del trigger (ancho por defecto `w-48`). */
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
};

export function TenantSelect({
  value,
  onValueChange,
  allowAll = false,
  disableSuspended = false,
  className,
  ariaLabel = "Seleccionar tenant",
  placeholder,
}: TenantSelectProps) {
  const tenantsQuery = useTenantsQuery();
  const tenants = tenantsQuery.data?.data ?? [];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn("w-48", className)} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value={ALL_TENANTS}>Todos los tenants</SelectItem>}
        {tenants.map((tenant) => {
          const suspended = tenant.status === "suspended";
          return (
            <SelectItem key={tenant.id} value={tenant.id} disabled={disableSuspended && suspended}>
              {tenant.name}
              {disableSuspended && suspended && (
                <span className="text-muted-foreground"> · suspendido</span>
              )}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
