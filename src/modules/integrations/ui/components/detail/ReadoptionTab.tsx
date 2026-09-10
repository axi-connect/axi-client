"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { readoptionHasWork, type ReadoptionPreviewDTO } from "@/modules/integrations/domain/integration";
import {
  applyReadoption,
  getReadoptionPreview,
} from "@/modules/integrations/infrastructure/services/integrations-service.adapter";

/**
 * Pestaña Reconexión (plan catalog_taxonomy_classification, D9). Cuando la
 * tienda ya estuvo conectada, la conexión nueva hereda el espejo (vínculos,
 * gobierno, curaduría) y las copias se fusionan: gana la que tiene pedidos, si
 * no la más antigua. Nada se borra: las copias retiradas quedan ocultas.
 * Mientras haya copias que fusionar la sincronización está PAUSADA.
 */
export function ReadoptionTab({
  integrationId,
  onChanged,
}: {
  integrationId: string;
  onChanged: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<ReadoptionPreviewDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPreview(await getReadoptionPreview(integrationId));
    } catch (err) {
      setError(errorMessage(err, "No se pudo calcular la reconexión"));
    }
  }, [integrationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = async () => {
    if (applying) return;
    setApplying(true);
    setNotice(null);
    try {
      const result = await applyReadoption(integrationId);
      setNotice(
        `Listo: ${result.adopted} productos pasaron a esta conexión y ${result.retired} copias quedaron ocultas. Ya puedes sincronizar.`,
      );
      await Promise.all([load(), onChanged()]);
    } catch (err) {
      setNotice(errorMessage(err, "No se pudo aplicar la reconexión"));
    } finally {
      setApplying(false);
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
  if (preview === null) return <Skeleton className="h-48 rounded-lg" />;

  if (!readoptionHasWork(preview)) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border p-4">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
        <div>
          <p className="font-medium">Nada que re-adoptar</p>
          <p className="text-sm text-muted-foreground">
            No hay rastro de una conexión anterior de esta tienda. Si la reconectas más adelante, el
            catálogo se hereda aquí en vez de duplicarse.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Reconexión de la tienda</h3>
          <p className="text-sm text-muted-foreground">
            Esta tienda ya estuvo conectada. El catálogo anterior pasa a esta conexión y las copias
            se fusionan. <span className="font-medium text-foreground">Nada se borra:</span> las copias
            retiradas quedan ocultas y recuperables.
          </p>
        </div>
        {preview.paused && <Badge variant="secondary">Sincronización pausada</Badge>}
      </div>

      {preview.paused && (
        <Alert>
          <TriangleAlert aria-hidden="true" className="size-4" />
          <AlertTitle>La sincronización espera esta revisión</AlertTitle>
          <AlertDescription>
            Sin la reconexión, cada producto se crearía otra vez con un SKU nuevo. Aplica primero y
            luego sincroniza.
          </AlertDescription>
        </Alert>
      )}

      <dl className="grid gap-x-6 gap-y-2 rounded-lg border border-border p-4 text-sm sm:grid-cols-2">
        <Row label="Conexiones anteriores" value={preview.previous_connection_ids.length} />
        <Row label="Productos que se conservan" value={preview.products_to_adopt} />
        <Row label="Copias que se retiran" value={preview.products_to_retire} />
        <Row label="Vínculos que pasan a esta conexión" value={preview.links_to_move} />
        <Row label="Colecciones curadas que se conservan" value={preview.collection_rules_to_move} />
        <Row label="Con pedidos en ambas copias" value={preview.blocked.length} tone={preview.blocked.length === 0 ? "ok" : "warn"} />
      </dl>

      {preview.groups.length > 0 && (
        <details className="rounded-lg border border-border">
          <summary className="cursor-pointer px-4 py-2 text-sm font-medium">
            Ver las {preview.groups.length} fusiones
          </summary>
          <ul className="max-h-72 divide-y divide-border overflow-y-auto text-sm">
            {preview.groups.map((group) => (
              <li key={group.external_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <span className="truncate font-medium">{group.keeper_name}</span>
                <span className="text-xs text-muted-foreground">
                  se conserva 1 · se retiran {group.loser_ids.length}
                  {group.blocked_loser_ids.length > 0 ? ` · ${group.blocked_loser_ids.length} con pedidos (no se tocan)` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {preview.blocked.length > 0 && (
        <Alert>
          <TriangleAlert aria-hidden="true" className="size-4" />
          <AlertTitle>Hay copias con pedidos en ambos lados</AlertTitle>
          <AlertDescription>
            {preview.blocked.length} productos tienen pedidos en las dos copias y no se fusionan
            solos. Resuélvelos desde el catálogo antes de aplicar.
          </AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground">
        Gana la copia con pedidos; si ninguna los tiene, la más antigua (fotos, metadatos e
        historial). Es idempotente: aplicar dos veces no hace nada nuevo.
      </p>
      {notice !== null && <p className="text-sm text-muted-foreground">{notice}</p>}
      <Button onClick={() => void apply()} disabled={applying || !preview.can_apply}>
        {applying && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        Aplicar reconexión
      </Button>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          tone === "ok" ? "font-medium tabular-nums text-success" : tone === "warn" ? "font-medium tabular-nums text-warning" : "font-medium tabular-nums"
        }
      >
        {value.toLocaleString("es-CO")}
      </dd>
    </div>
  );
}
