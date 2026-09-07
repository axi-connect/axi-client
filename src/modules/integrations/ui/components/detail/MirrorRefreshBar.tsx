"use client";

import { LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import { StatusDotBadge } from "../StatusDotBadge";

/**
 * Cabecera común de los espejos ligeros (Envíos/Promociones): título, lead,
 * «Actualizado hace X» y «Actualizar desde {proveedor}». El último error del
 * espejo se muestra como aviso, no como fallo de la pestaña: las filas que hay
 * siguen siendo válidas.
 */
export function MirrorRefreshBar({
  title,
  lead,
  providerLabel,
  syncedAt,
  lastError,
  refreshing,
  onRefresh,
}: {
  title: string;
  lead: string;
  providerLabel: string;
  syncedAt: string | null;
  lastError: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{lead}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusDotBadge tone={syncedAt !== null ? "ok" : "off"}>
            {syncedAt !== null ? (
              <>
                Actualizado <RelativeDate iso={syncedAt} />
              </>
            ) : (
              "Sin actualizar todavía"
            )}
          </StatusDotBadge>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <RefreshCw aria-hidden="true" className="size-4" />
            )}
            Actualizar desde {providerLabel}
          </Button>
        </div>
      </div>
      {lastError !== null && (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription>
            La última actualización no terminó bien: {lastError}. Lo que ves es el espejo
            anterior; vuelve a intentarlo o rota las credenciales si persiste.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
