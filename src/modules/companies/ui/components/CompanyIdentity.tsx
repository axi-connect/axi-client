"use client"

import { useSession } from "@/shared/auth/auth.hooks"
import { Avatar } from "@/shared/components/ui/avatar"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { BrandMark } from "@/shared/components/ui/brand-mark"
import { useMyCompany } from "@/modules/companies/infrastructure/hooks/use-my-company"

/**
 * Identidad del tenant para el header del sidebar: isotipo + nombre de la
 * empresa (`GET /companies/me`, store compartido `my-company.store.ts`) y rol
 * del usuario. Fallbacks: skeleton mientras carga; marca Axi (BrandMark +
 * "axi connect") si no hay logo o si el fetch falla (p.ej. 403 por RBAC en
 * roles sin permiso de empresa). Al guardar «Mi empresa» se repinta solo.
 *
 * Se inyecta en `AppSidebar` desde `(private)/layout.tsx` (shared no puede
 * importar de modules — arquitectura §3.3). La parte textual se oculta en
 * modo colapsado vía `group-data-[collapsible=icon]` del sidebar.
 */

export function CompanyIdentity() {
  const { user, status } = useSession()
  const { company, loading } = useMyCompany()

  if (loading || status === "loading") {
    return (
      <div className="flex items-center gap-2" role="status" aria-label="Cargando empresa">
        <Skeleton className="size-8 shrink-0 rounded-md" />
        <div className="flex flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {company?.isotype_url ? (
        <Avatar
          src={company.isotype_url}
          alt={`Logo de ${company.name}`}
          fallback={company.name}
          shape="square"
          size={32}
        />
      ) : (
        <BrandMark className="size-8 shrink-0" aria-label="Axi Connect" />
      )}
      <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate text-sm font-medium">{company?.name ?? "axi connect"}</span>
        <span className="truncate text-xs text-foreground/70 capitalize">{user?.role?.name ?? ""}</span>
      </div>
    </div>
  )
}
