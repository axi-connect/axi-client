"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { IntegrationLocationDTO } from "@/modules/integrations/domain/integration";
import {
  listIntegrationLocations,
  updateIntegrationLocations,
} from "@/modules/integrations/infrastructure/services/integrations-service.adapter";

/**
 * Pestaña Ubicaciones (D6): qué locations del proveedor SUMAN al stock que el
 * agente ofrece. Es la decisión de negocio del tenant — ¿vendo contra el stock
 * de todas mis tiendas físicas o solo el de la bodega online?
 */
export function LocationsTab({
  integrationId,
  onChanged,
}: {
  integrationId: string;
  onChanged: () => Promise<void>;
}) {
  const groupId = useId();
  const [items, setItems] = useState<IntegrationLocationDTO[] | null>(null);
  const [counting, setCounting] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listIntegrationLocations(integrationId);
      setItems(res.items);
      setCounting(
        new Set(res.items.filter((item) => item.counts_stock).map((item) => item.external_location_id)),
      );
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar las ubicaciones de la tienda"));
    }
  }, [integrationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await updateIntegrationLocations(integrationId, [...counting]);
      setItems(res.items);
      setNotice(
        "Guardado. Estamos recalculando el stock con estas ubicaciones: el avance se ve en la pestaña Historial.",
      );
      await onChanged();
    } catch (err) {
      setNotice(errorMessage(err, "No se pudo guardar la selección"));
    } finally {
      setSaving(false);
    }
  };

  if (error !== null) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (items === null) return <Skeleton className="h-48 rounded-lg" />;

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-muted-foreground">
        El inventario que ve tu agente es la SUMA de las ubicaciones marcadas. Una ubicación sin
        marcar existe en tu tienda, pero su stock no se ofrece por WhatsApp.
      </p>

      <ul className="divide-y divide-border/60 rounded-lg border border-border p-4 md:p-6">
        {items.map((location) => {
          const inputId = `${groupId}-${location.external_location_id}`;
          return (
            <li key={location.external_location_id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <input
                id={inputId}
                type="checkbox"
                checked={counting.has(location.external_location_id)}
                disabled={!location.is_active}
                onChange={(event) =>
                  setCounting((prev) => {
                    const next = new Set(prev);
                    if (event.target.checked) next.add(location.external_location_id);
                    else next.delete(location.external_location_id);
                    return next;
                  })
                }
                className="mt-0.5 size-4.5 shrink-0 accent-primary"
              />
              <div className="min-w-0">
                <label htmlFor={inputId} className="cursor-pointer font-medium">
                  {location.name}
                </label>
                {!location.is_active && (
                  <p className="text-xs text-muted-foreground">
                    Inactiva en la tienda: su stock no cuenta aunque se marque.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {notice !== null && <p className="text-sm text-muted-foreground">{notice}</p>}

      <Button onClick={() => void save()} disabled={saving}>
        {saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        Guardar ubicaciones
      </Button>
    </div>
  );
}
