"use client";

/**
 * Header persistente del detalle (vive en el layout, no se re-monta entre
 * tabs): nombre editable inline (PATCH {name} → re-fetch), StatusBadge,
 * metadatos, el botón principal «Preparar entrega» y las mismas acciones de
 * la fila en ⋮ (`TenantRowActions` reutilizado — un solo flujo de suspensión;
 * extender la prueba sigue ahí).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Check, LifeBuoy, LoaderCircle, PackageCheck, PencilLine, X } from "lucide-react";
import { useAlert } from "@/core/providers/alert-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "../../../../domain/dates";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useTenantQuery, useUpdateTenant } from "../../../../infrastructure/api/hooks/use-tenants";
import { EmptyState } from "../../../components/EmptyState";
import { ProblemAlert } from "../../../components/ProblemAlert";
import { StatusBadge } from "../../../components/StatusBadge";
import { TenantRowActions } from "../TenantRowActions";
import { SupportSessionDialog } from "../SupportSessionDialog";
import { isDispatchedDelivery } from "../../../../domain/delivery";
import { useLatestDelivery } from "../../../../infrastructure/api/hooks/use-delivery";
import { usePlatformRole } from "../../../../infrastructure/auth/use-platform-role";
import { clearLegacyOwnerCredentials } from "../../../../domain/tenant";
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
      // `min-w-0` en cada nivel: sin él, el truncate no tiene ancho del que
      // recortar y en el celular el nombre se cortaba sin «…» (QA H3-6).
      <span className="flex min-w-0 max-w-full items-center gap-2">
        <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight sm:text-3xl" title={name}>
          {name}
        </h1>
        <button
          type="button"
          aria-label={`Renombrar ${name}`}
          onClick={() => { setValue(name); setEditing(true); }}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
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
  const pathname = usePathname();
  const deliveryHref = `/platform/tenants/${tenantId}/entrega`;
  const onDeliveryPage = pathname === deliveryHref;
  const latest = useLatestDelivery(tenantId);
  const canEnterSupport = usePlatformRole() !== "billing_ops";
  const [supportOpen, setSupportOpen] = useState(false);
  // La ficha mostraba la contraseña del dueño que dejaba el alta: si queda
  // algo de una pestaña vieja, se borra sin mostrarse.
  useEffect(() => clearLegacyOwnerCredentials(), []);

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

  const dispatched = isDispatchedDelivery(latest.data?.delivery);
  const initials = tenant.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 max-w-full items-center gap-4">
        <span
          aria-hidden="true"
          className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-foreground font-heading text-xl font-bold text-background sm:flex dark:border dark:border-border dark:bg-card dark:text-foreground"
        >
          {initials}
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <InlineNameEditor tenantId={tenant.id} name={tenant.name} />
            <StatusBadge status={tenant.status} />
          </div>
          <p className="flex flex-wrap gap-x-1.5 text-sm text-muted-foreground [&>span]:whitespace-nowrap">
            <span>
              NIT <span className="font-mono tabular-nums">{tenant.nit}</span>
            </span>
            {tenant.city ? <span>· {tenant.city}</span> : null}
            <span>· {tenant.country_code}</span>
            <span>· {tenant.users_count === 1 ? "1 usuario" : `${tenant.users_count} usuarios`}</span>
            <span>· creada el {formatShortDate(tenant.created_at)}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onDeliveryPage ? null : dispatched ? (
          canEnterSupport ? (
            <Button type="button" variant="outline" onClick={() => setSupportOpen(true)}>
              <LifeBuoy aria-hidden="true" />
              Entrar como soporte
            </Button>
          ) : null
        ) : (
          <Button asChild>
            <Link href={deliveryHref}>
              <PackageCheck aria-hidden="true" />
              Preparar entrega
            </Link>
          </Button>
        )}
        <TenantRowActions tenant={tenant} showViewAction={false} />
      </div>
      {supportOpen ? (
        <SupportSessionDialog
          open
          onOpenChange={(open) => {
            if (!open) setSupportOpen(false);
          }}
          tenant={{ id: tenant.id, name: tenant.name }}
        />
      ) : null}
    </header>
  );
}
