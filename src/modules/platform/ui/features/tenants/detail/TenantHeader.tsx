"use client";

/**
 * Header persistente del detalle (vive en el layout, no se re-monta entre
 * tabs): nombre editable inline (PATCH {name} → re-fetch), StatusBadge,
 * metadatos y las mismas acciones Suspender/Reactivar de la fila
 * (`TenantRowActions` reutilizado — un solo flujo de suspensión).
 */
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, LoaderCircle, PencilLine, X } from "lucide-react";
import { useAlert } from "@/core/providers/alert-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "@/core/lib/format";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useTenantQuery, useUpdateTenant } from "../../../../infrastructure/api/hooks/use-tenants";
import { EmptyState } from "../../../components/EmptyState";
import { ProblemAlert } from "../../../components/ProblemAlert";
import { StatusBadge } from "../../../components/StatusBadge";
import { TenantRowActions } from "../TenantRowActions";
import { Building2 } from "lucide-react";

function InlineNameEditor({ tenantId, name }: { tenantId: string; name: string }) {
  const { showAlert } = useAlert();
  const updateTenant = useUpdateTenant();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      setValue(name);
      return;
    }
    try {
      await updateTenant.mutateAsync({ id: tenantId, body: { name: trimmed } });
      setEditing(false);
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo renombrar", description: errorMessage(error) });
    }
  }

  if (!editing) {
    return (
      <span className="flex items-center gap-2">
        <h1 className="truncate text-3xl font-semibold tracking-tight">{name}</h1>
        <button
          type="button"
          aria-label={`Renombrar ${name}`}
          onClick={() => { setValue(name); setEditing(true); }}
          className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <PencilLine aria-hidden="true" className="size-4" />
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") { setEditing(false); setValue(name); }
        }}
        autoFocus
        aria-label="Nuevo nombre del tenant"
        className="h-9 max-w-xs text-lg font-semibold"
        disabled={updateTenant.isPending}
      />
      <Button size="sm" variant="outline" onClick={() => void save()} disabled={updateTenant.isPending} aria-label="Guardar nombre">
        {updateTenant.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => { setEditing(false); setValue(name); }}
        disabled={updateTenant.isPending}
        aria-label="Cancelar edición"
      >
        <X />
      </Button>
    </span>
  );
}

export function TenantHeader({ tenantId }: { tenantId: string }) {
  const { data: tenant, isPending, isError, error, refetch } = useTenantQuery(tenantId);

  if (isPending) {
    return (
      <div className="space-y-2" role="status" aria-label="Cargando tenant">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
    );
  }

  if (isError) return <ProblemAlert error={error} onRetry={() => void refetch()} />;

  if (!tenant) {
    return (
      <EmptyState
        icon={Building2}
        title="Tenant no encontrado"
        description="El tenant no existe o fue retirado de la plataforma."
        action={
          <Button asChild variant="outline">
            <Link href="/platform/tenants">
              <ArrowLeft aria-hidden="true" />
              Volver a Tenants
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <InlineNameEditor tenantId={tenant.id} name={tenant.name} />
          <StatusBadge status={tenant.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          NIT <span className="font-mono tabular-nums">{tenant.nit}</span>
          {tenant.city ? ` · ${tenant.city}` : ""} · {tenant.country_code} ·{" "}
          {tenant.users_count === 1 ? "1 usuario" : `${tenant.users_count} usuarios`} · creada el{" "}
          {formatShortDate(tenant.created_at)}
        </p>
      </div>
      <TenantRowActions tenant={tenant} showViewAction={false} />
    </header>
  );
}
