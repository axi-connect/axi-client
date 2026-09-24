"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { HttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import type { CommercialProposalDTO } from "@/modules/commercial/domain/commercial";
import { getProposal } from "@/modules/commercial/infrastructure/services/commercial-service.adapter";
import { useAuth } from "@/shared/auth/auth.hooks";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ActionDetailBody, ActionDetailFooter, ActionDetailHeader, useActionDetail } from "./components/ActionDetail";

type Load =
  | { kind: "loading" }
  | { kind: "ready"; proposal: CommercialProposalDTO }
  | { kind: "gone" }
  | { kind: "error"; message: string };

/**
 * Adaptador ruta → panel de `/comercial/acciones/[id]` (patrón
 * `InvoiceDetailRoute`): `back` en la ruta interceptada (el atrás del
 * navegador cierra) y `replace` en la navegación dura, donde no hay historial
 * y cerrar lleva a la ruta del mes. Un solo `DetailSheet` para los tres
 * estados (cargando, error, listo): cambiar de panel animaría dos veces.
 *
 * `DetailSheet` es Radix Dialog: foco atrapado dentro, `aria-modal`, Esc y el
 * fondo cierran, y el foco vuelve a donde estaba.
 */
export function ActionSheetRoute({ proposalId, closeBehavior }: { proposalId: string; closeBehavior: "back" | "replace" }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canRead = hasPermission("commercial:read");
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const proposal = load.kind === "ready" ? load.proposal : null;

  // El servidor dijo que ya no está como se pinta (409: la decidió otra
  // persona o pestaña; 403): se vuelve a leer SIN pasar por el skeleton —el
  // panel no parpadea—. La lista de la ruta la recarga el store (C4).
  const onStale = useCallback(() => {
    getProposal(proposalId)
      .then((data) => {
        setLoad({ kind: "ready", proposal: data });
      })
      .catch((error: unknown) => {
        if (error instanceof HttpError && error.status === 404) setLoad({ kind: "gone" });
      });
  }, [proposalId]);
  const state = useActionDetail(proposalId, proposal, onStale);

  useEffect(() => {
    if (!canRead) return;
    let alive = true;
    setLoad({ kind: "loading" });
    getProposal(proposalId)
      .then((data) => {
        if (alive) setLoad({ kind: "ready", proposal: data });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        // 404 = no existe o no es del método comercial: un estado normal, no un fallo de red.
        if (error instanceof HttpError && error.status === 404) setLoad({ kind: "gone" });
        else setLoad({ kind: "error", message: errorMessage(error) });
      });
    return () => {
      alive = false;
    };
  }, [proposalId, attempt, canRead]);

  function close() {
    if (closeBehavior === "back") router.back();
    else router.replace("/comercial");
  }

  return (
    <DetailSheet
      open
      size="lg"
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={proposal?.title ?? "Acción propuesta"}
      renderHeader={proposal === null ? undefined : () => <ActionDetailHeader proposal={proposal} state={state} />}
      renderFooter={proposal === null ? undefined : () => <ActionDetailFooter state={state} />}
    >
      {!canRead ? (
        <p className="text-sm text-muted-foreground">Pídele a un administrador el permiso de lectura del módulo.</p>
      ) : load.kind === "loading" ? (
        <div className="space-y-3" role="status" aria-label="Cargando la acción" aria-busy="true">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : load.kind === "gone" ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm font-semibold">Esta acción ya no está</p>
          <p className="text-sm text-muted-foreground">Venció o alguien de tu equipo la decidió.</p>
          <Button variant="outline" size="sm" onClick={close}>
            Volver a la ruta
          </Button>
        </div>
      ) : load.kind === "error" ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm">{load.message}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAttempt((n) => n + 1);
            }}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <ActionDetailBody proposal={load.proposal} state={state} />
      )}
    </DetailSheet>
  );
}
