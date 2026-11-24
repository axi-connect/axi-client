"use client";

/**
 * La ruta legible de la consola (rediseño F1): «Empresas › Norte Studio ›
 * Plan y límites». Solo en las rutas de más de un nivel; en las de un nivel el
 * encabezado ya dice dónde estás. Todos los tramos tienen texto
 * (`breadcrumbFor`): nunca sale un segmento crudo ni un UUID.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { breadcrumbFor, type Crumb } from "../../domain/navigation";
import { useTenantQuery } from "../../infrastructure/api/hooks/use-tenants";

/** Una empresa: su nombre desde la caché de la lista (misma query que la ficha, sin pedir nada). */
function TenantName({ id }: { id: string }) {
  const { data: tenant } = useTenantQuery(id);
  return <>{tenant?.name ?? "Empresa"}</>;
}

function CrumbLabel({ crumb }: { crumb: Crumb }) {
  return crumb.tenantId ? <TenantName id={crumb.tenantId} /> : <>{crumb.label}</>;
}

export function PlatformBreadcrumb() {
  const pathname = usePathname() ?? "";
  const crumbs = breadcrumbFor(pathname);
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Ruta" className="min-w-0 text-[13px] text-muted-foreground">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
        {crumbs.map((crumb, index) => (
          <li key={`${index}-${crumb.label}`} className="flex min-w-0 items-center gap-1.5">
            {index > 0 ? <ChevronRight aria-hidden="true" className="size-3 shrink-0 opacity-60" /> : null}
            {crumb.href ? (
              <Link
                prefetch={false}
                href={crumb.href}
                className="block max-w-[16rem] truncate rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <CrumbLabel crumb={crumb} />
              </Link>
            ) : (
              <span aria-current="page" className="block max-w-[20rem] truncate font-medium text-foreground">
                <CrumbLabel crumb={crumb} />
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
