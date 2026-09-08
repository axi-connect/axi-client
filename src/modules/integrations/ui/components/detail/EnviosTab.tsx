"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { StatusDotBadge } from "@/shared/components/ui/status-badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { IntegrationDTO } from "@/modules/integrations/domain/integration";
import { integrationProvider } from "@/modules/integrations/domain/integration-providers";
import { refreshIntegrationShipping } from "@/modules/integrations/infrastructure/services/integrations-service.adapter";
import {
  describeRateCondition,
  describeRatePrice,
  isRestOfCountry,
  RATE_KIND_LABELS,
  type ShippingZoneDTO,
} from "@/modules/shipping/domain/shipping";
import { listShippingZones } from "@/modules/shipping/infrastructure/services/shipping-service.adapter";
import { MirrorRefreshBar } from "./MirrorRefreshBar";

/** Departamentos visibles por zona antes del «+N». */
const MAX_PROVINCE_CHIPS = 4;

/**
 * Pestaña Envíos (plan envíos+promos F6): espejo de solo lectura de los
 * perfiles de envío del proveedor. La IA estima el flete por departamento con
 * estas filas; el total exacto lo pone el proveedor al cerrar. Solo se listan
 * las zonas gobernadas por ESTA conexión: una tarifa local que hubiera quedado
 * de antes no se mezcla.
 */
export function EnviosTab({
  integration,
  onChanged,
}: {
  integration: IntegrationDTO;
  onChanged: () => Promise<void>;
}) {
  const provider = integrationProvider(integration.provider);
  const [zones, setZones] = useState<ShippingZoneDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const all = await listShippingZones();
      setZones(all.filter((zone) => zone.governed_by_connection_id === integration.id));
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar las zonas de envío"));
    }
  }, [integration.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    setNotice(null);
    try {
      const summary = await refreshIntegrationShipping(integration.id);
      setNotice(
        `Espejo actualizado: ${summary.zones} zonas y ${summary.rates} tarifas` +
          (summary.skipped_currency > 0
            ? ` · ${summary.skipped_currency} tarifas en otra moneda se omitieron`
            : "") +
          ".",
      );
      await Promise.all([load(), onChanged()]);
    } catch (err) {
      setNotice(errorMessage(err, `No se pudo actualizar desde ${provider.label}`));
    } finally {
      setRefreshing(false);
    }
  };

  if (error !== null) {
    return (
      <div className="max-w-2xl space-y-3">
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (zones === null) return <Skeleton className="h-64 rounded-lg" />;

  return (
    <div className="space-y-5">
      <MirrorRefreshBar
        title={`Zonas y tarifas de tu ${provider.noun.singular}`}
        lead={`Espejo de los perfiles de envío de ${provider.label}. La IA los usa para estimar el envío por departamento; el total exacto lo calcula ${provider.label} al cerrar.`}
        providerLabel={provider.label}
        syncedAt={integration.mirrors.shipping_synced_at}
        lastError={integration.mirrors.shipping_last_error}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
      />

      {notice !== null && <p className="text-sm text-muted-foreground">{notice}</p>}

      {zones.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          Todavía no hay zonas espejadas. Pulsa «Actualizar desde {provider.label}» o revisa que la
          app tenga el permiso de envíos.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zona / tarifa</TableHead>
                <TableHead>Condición</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead>Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <ZoneRows key={zone.id} zone={zone} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Las tarifas de transportadora y las condicionadas por peso no se pueden estimar: la IA le
        dice al cliente que el envío se confirma al cerrar el pedido.
      </p>
    </div>
  );
}

function ZoneRows({ zone }: { zone: ShippingZoneDTO }) {
  const provinces = zone.provinces.map((province) => province.name);
  const shown = provinces.slice(0, MAX_PROVINCE_CHIPS);
  const rest = provinces.length - shown.length;
  return (
    <>
      <TableRow className="bg-secondary/40 hover:bg-secondary/40">
        <TableCell colSpan={4} className="py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{zone.name}</span>
            {isRestOfCountry(zone) ? (
              <Badge variant="outline" className="text-muted-foreground">
                {zone.country_code === "CO" ? "Todos los demás departamentos" : "Todo el país"}
              </Badge>
            ) : (
              <>
                {shown.map((name) => (
                  <Badge key={name} variant="outline">
                    {name}
                  </Badge>
                ))}
                {rest > 0 && (
                  <Badge variant="outline" className="text-muted-foreground" title={provinces.slice(MAX_PROVINCE_CHIPS).join(", ")}>
                    +{rest}
                  </Badge>
                )}
              </>
            )}
            {zone.country_code !== "CO" && (
              <Badge variant="outline" className="text-muted-foreground">
                {zone.country_code}
              </Badge>
            )}
          </div>
        </TableCell>
      </TableRow>
      {zone.rates.length === 0 && (
        <TableRow>
          <TableCell colSpan={4} className="text-sm text-muted-foreground">
            Sin tarifas activas en esta zona.
          </TableCell>
        </TableRow>
      )}
      {zone.rates.map((rate) => {
        const price = describeRatePrice(rate);
        const condition = describeRateCondition(rate);
        return (
          <TableRow key={rate.id}>
            <TableCell className="pl-6">{rate.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {condition ?? (rate.kind === "live" ? "Según peso o destino" : "—")}
            </TableCell>
            <TableCell className={cn("text-right tabular-nums", !price.known && "text-muted-foreground")}>
              {price.text}
            </TableCell>
            <TableCell>
              {rate.kind === "live" ? (
                // Único acento secundario de la vista (ámbar), como punto sobre
                // secondary: el tinte con texto ámbar no pasa AA en claro.
                <StatusDotBadge tone="warning">{RATE_KIND_LABELS.live}</StatusDotBadge>
              ) : (
                <Badge variant="secondary">{RATE_KIND_LABELS.flat}</Badge>
              )}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
