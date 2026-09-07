"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "@/core/lib/format";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
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
import { refreshIntegrationDiscounts } from "@/modules/integrations/infrastructure/services/integrations-service.adapter";
import {
  describePromotionKind,
  promotionState,
  PROMOTION_STATE_LABELS,
  type PromotionDTO,
} from "@/modules/marketing/domain/promotion";
import { listPromotions } from "@/modules/marketing/infrastructure/services/promotions-service.adapter";
import { StatusDotBadge } from "@/shared/components/ui/status-badges";
import { MirrorRefreshBar } from "./MirrorRefreshBar";

/**
 * Pestaña Promociones (plan envíos+promos F6): las promociones vigentes del
 * proveedor, espejadas en Marketing como solo lectura. «Cómo se aplica» es el
 * resumen del proveedor: axi no calcula montos aquí ni en el prompt.
 */
export function PromocionesTab({
  integration,
  onChanged,
}: {
  integration: IntegrationDTO;
  onChanged: () => Promise<void>;
}) {
  const provider = integrationProvider(integration.provider);
  const [promotions, setPromotions] = useState<PromotionDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    setError(null);
    try {
      const all = await listPromotions();
      setPromotions(all.filter((promotion) => promotion.governed_by_connection_id === integration.id));
      setNow(new Date());
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar las promociones"));
    }
  }, [integration.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    setNotice(null);
    try {
      const summary = await refreshIntegrationDiscounts(integration.id);
      setNotice(
        `Espejo actualizado: ${summary.promotions} promociones` +
          (summary.removed > 0 ? ` · ${summary.removed} ya no están en la tienda` : "") +
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

  if (promotions === null) return <Skeleton className="h-64 rounded-lg" />;

  return (
    <div className="space-y-5">
      <MirrorRefreshBar
        title={`Promociones activas en tu ${provider.noun.singular}`}
        lead={`Se leen de ${provider.label} y aparecen en Marketing como promociones de solo lectura. La IA las menciona tal como están escritas aquí; los montos los aplica ${provider.label} al pagar.`}
        providerLabel={provider.label}
        syncedAt={integration.mirrors.discounts_synced_at}
        lastError={integration.mirrors.discounts_last_error}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
      />

      {notice !== null && <p className="text-sm text-muted-foreground">{notice}</p>}

      {promotions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          Tu {provider.noun.singular} no tiene promociones activas ni programadas, o el espejo aún
          no corrió. Pulsa «Actualizar desde {provider.label}» para comprobarlo.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Promoción</TableHead>
                <TableHead>Cómo se aplica</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promotion) => {
                const codes = promotion.shared_code
                  ? [promotion.shared_code]
                  : promotion.external_codes;
                const state = promotionState(promotion, now);
                return (
                  <TableRow key={promotion.id}>
                    <TableCell>
                      <p className="font-medium">{promotion.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {describePromotionKind(promotion)}
                      </p>
                    </TableCell>
                    <TableCell>{codes.length > 0 ? "Con código" : "Automática"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {codes.length > 0 ? codes.join(", ") : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {describeValidity(promotion, now)}
                    </TableCell>
                    <TableCell>
                      <StatusDotBadge tone={state === "live" ? "ok" : "off"}>
                        {PROMOTION_STATE_LABELS[state]}
                      </StatusDotBadge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function describeValidity(promotion: PromotionDTO, now: Date): string {
  const starts = new Date(promotion.starts_at);
  const future = starts.getTime() > now.getTime();
  if (promotion.ends_at === null) {
    return future ? `Desde el ${formatShortDate(promotion.starts_at)}` : "Sin fecha de fin";
  }
  return future
    ? `${formatShortDate(promotion.starts_at)} – ${formatShortDate(promotion.ends_at)}`
    : `Hasta el ${formatShortDate(promotion.ends_at)}`;
}
