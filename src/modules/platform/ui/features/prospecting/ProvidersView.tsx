"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { PageHeader } from "@/shared/components/layout/page-header";

import {
  PROVIDER_DESCRIPTORS,
  type ProviderName,
} from "@/modules/platform/domain/prospecting-providers";
import {
  useProviderAccountsQuery,
  useProviderCatalogQuery,
} from "@/modules/platform/infrastructure/api/hooks/use-prospecting-providers";
import { ProviderCard } from "./ProviderCard";
import { ConnectProviderSheet } from "./ConnectProviderSheet";

/**
 * Los proveedores externos de la captación de leads.
 *
 * Aquí es donde se pegan las llaves de axi — el tenant nunca ve esta pantalla
 * ni toca una credencial. Dos cosas que la vista tiene que dejar claras:
 *
 * 1. **El orden importa y cuesta dinero.** La cascada consulta por prioridad,
 *    así que poner una fuente gratuita delante de una de pago es la diferencia
 *    entre gastar créditos y no gastarlos. Por eso las tarjetas van ordenadas
 *    por prioridad y el número se muestra.
 * 2. **«Sin llave» no es lo mismo que «apagado».** Una cuenta puede existir con
 *    la credencial revocada, y eso no se ve mirando el interruptor.
 */
export function ProvidersView() {
  const catalog = useProviderCatalogQuery();
  const accounts = useProviderAccountsQuery();
  const [connecting, setConnecting] = useState<ProviderName | null>(null);

  const connected = new Set(
    (accounts.data ?? []).map((account) => account.provider),
  );
  const available = (catalog.data ?? []).filter(
    (entry) => !connected.has(entry.provider),
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Proveedores de datos"
        description="Las fuentes con las que se verifican y completan los leads. Las llaves son de axi: los tenants eligen la fuente y consumen su cuota, pero nunca ven una credencial."
      />

      {accounts.isLoading ? (
        <TableSkeleton rows={3} />
      ) : (accounts.data ?? []).length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Todavía no hay ningún proveedor conectado"
          description="Sin proveedores, el motor de calidad funciona igual con sus señales gratuitas: lo que falta es confirmar si un buzón existe de verdad y traer datos que no tenemos."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {(accounts.data ?? []).map((account) => (
            <ProviderCard key={account.id} account={account} />
          ))}
        </div>
      )}

      {available.length > 0 && (
        <section>
          <h2 className="font-heading mb-1 text-base font-bold">Disponibles</h2>
          <p className="text-muted-foreground mb-3 text-xs">
            Conectar uno no lo enciende: se da de alta apagado, porque a partir
            de ahí empieza a costar dinero.
          </p>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))]">
            {available.map((entry) => {
              const descriptor = PROVIDER_DESCRIPTORS[entry.provider];
              return (
                <article
                  key={entry.provider}
                  className="border-border shadow-float bg-background flex flex-col gap-2 rounded-lg border p-4"
                >
                  <h3 className="font-heading text-sm font-bold">
                    {descriptor.label}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {descriptor.tagline}
                  </p>
                  {descriptor.note !== undefined && (
                    <p className="text-warning/90 bg-warning/8 border-warning/25 rounded-md border px-2 py-1.5 text-[11px]">
                      {descriptor.note}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto self-start"
                    onClick={() => setConnecting(entry.provider)}
                  >
                    <Plus className="size-4" aria-hidden />
                    Conectar
                  </Button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {catalog.isError && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void catalog.refetch()}
          >
            <RefreshCw className="size-4" aria-hidden />
            Reintentar
          </Button>
        </div>
      )}

      {connecting !== null && (
        <ConnectProviderSheet
          provider={connecting}
          credentialMode={
            (catalog.data ?? []).find((entry) => entry.provider === connecting)
              ?.credential_mode ?? "api_key"
          }
          onClose={() => setConnecting(null)}
        />
      )}
    </div>
  );
}
