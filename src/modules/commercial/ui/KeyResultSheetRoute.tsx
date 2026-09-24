"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { isKeyResultDetailKey } from "@/modules/commercial/domain/key-result";
import { useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { KeyResultDetail, KeyResultDetailFooter, keyResultTitle } from "./components/KeyResultDetail";

/**
 * Adaptador ruta → panel de `/comercial/resultados/[key]`. Lee del MISMO store
 * que la ruta del mes (el detalle es una vista de lo que ya se cargó); si se
 * llega por enlace directo, carga él. `back` en la ruta interceptada,
 * `replace` en la dura.
 */
export function KeyResultSheetRoute({ resultKey, closeBehavior }: { resultKey: string; closeBehavior: "back" | "replace" }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { loaded, hasCapability } = useEntitlements();
  const goal = useCommercialStore((state) => state.goal);
  const pace = useCommercialStore((state) => state.pace);
  const plan = useCommercialStore((state) => state.plan);
  const load = useCommercialStore((state) => state.load);

  const canRead = hasPermission("commercial:read");
  const canManage = hasPermission("commercial:manage");
  const enabled = !loaded || hasCapability("crm");
  const key = isKeyResultDetailKey(resultKey) ? resultKey : null;

  useEffect(() => {
    if (enabled && canRead && goal.status === "idle") void load();
  }, [enabled, canRead, goal.status, load]);

  function close() {
    if (closeBehavior === "back") router.back();
    else router.replace("/comercial");
  }

  const noGoal = goal.status === "ready" && goal.data?.goal === null;

  return (
    <DetailSheet
      open
      size="lg"
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={key === null ? "Resultado clave" : keyResultTitle(key)}
      subtitle="Resultado clave"
      renderFooter={key === null || pace.data === null ? undefined : () => <KeyResultDetailFooter detailKey={key} />}
    >
      {!canRead ? (
        <p className="text-sm text-muted-foreground">Pídele a un administrador el permiso de lectura del módulo.</p>
      ) : key === null ? (
        <p className="text-sm text-muted-foreground">Ese resultado no existe.</p>
      ) : noGoal ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">Aún no hay meta este mes: sin meta no hay camino que medir.</p>
          {canManage ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/comercial/meta">Definir la meta</Link>
            </Button>
          ) : null}
        </div>
      ) : pace.data === null ? (
        pace.status === "error" || goal.status === "error" ? (
          <p className="text-sm text-muted-foreground">{pace.error ?? goal.error ?? "No pude leer el ritmo."}</p>
        ) : (
          <div className="space-y-3" role="status" aria-label="Cargando el resultado" aria-busy="true">
            <Skeleton className="h-10 w-1/2 rounded-lg" />
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        )
      ) : (
        <KeyResultDetail detailKey={key} pace={pace.data} plan={plan.data} canManage={canManage} />
      )}
    </DetailSheet>
  );
}
