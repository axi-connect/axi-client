"use client";

import { useState } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { cn } from "@/core/lib/utils";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useFeatures } from "@/shared/auth/features.hooks";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type {
  DeliveryChannel,
  SendDocumentResultDTO,
} from "@/modules/documents/domain/delivery";
import {
  isOutdated,
  type DocumentDTO,
  type DocumentSubject,
} from "@/modules/documents/domain/document";
import { useDocumentTypes } from "@/modules/documents/infrastructure/hooks/use-document-types";
import { useDocuments } from "@/modules/documents/infrastructure/hooks/use-documents";
import { openDocumentFile } from "@/modules/documents/infrastructure/lib/open-document-file";
import {
  regenerateDocument,
  retryDocument,
} from "@/modules/documents/infrastructure/services/documents-service.adapter";
import { DocumentRow } from "./DocumentRow";
import { IssueDocumentMenu } from "./IssueDocumentMenu";
import { PaperMark } from "./PaperMark";
import { SendDocumentDialog, type SendIntent } from "./SendDocumentDialog";

/**
 * Los documentos de una entidad (F8 Cobros) — la MISMA lista para el rail del
 * pedido y la ficha del contacto; los consumidores le pasan el `subject` y
 * nada más. Autosuficiente: carga, se refresca por WS, y se gatea sola: sin la
 * función `documents` o sin permiso de lectura NO pinta nada — es el mismo
 * silencio que `PaymentPlanBlock` (explicárselo al operador sería ruido).
 *
 * `subjectUpdatedAt` es el `updated_at` de la entidad: si es posterior al
 * papel, la fila lo dice como dato («desactualizado»).
 */
export function DocumentsList({
  subject,
  subjectLabel,
  subjectUpdatedAt,
  className,
}: {
  subject: DocumentSubject;
  /** «la reserva JX-0042»: encabeza el menú «Emitir». */
  subjectLabel?: string;
  subjectUpdatedAt?: string | null;
  className?: string;
}) {
  const { hasPermission } = useAuth();
  const { loaded, hasFeature } = useFeatures();
  const enabled = loaded && hasFeature("documents");
  const canManage = hasPermission("documents:manage");
  const state = useDocuments(subject, enabled);
  const { types } = useDocumentTypes(enabled && canManage);
  const { showAlert } = useAlert();
  // F9: qué se está enviando; el diálogo es uno para toda la lista.
  const [sending, setSending] = useState<SendIntent | null>(null);

  if (!enabled || state.error === "gated") return null;

  // Sobre una persona no se emite: los papeles nacen del pedido o del pago.
  const issueSubject = subject.kind === "contact" ? null : subject;
  const canIssue = canManage && issueSubject !== null;
  const regenerable = new Set(
    (types ?? []).filter((type) => type.regenerable).map((type) => type.code),
  );

  async function view(id: string) {
    try {
      await openDocumentFile(id);
    } catch (error) {
      showAlert({
        tone: "error",
        title: "No se pudo abrir el PDF",
        description: errorMessage(error),
      });
    }
  }

  async function regenerate(id: string) {
    try {
      const result = await regenerateDocument(id);
      state.upsert(result.document);
      await state.refresh();
      showAlert({
        tone: "success",
        title: `${result.document.type_label} en camino`,
        description: `${result.document.number}: con los mismos datos del original, que queda como reemplazado.`,
      });
    } catch (error) {
      showAlert({
        tone: "error",
        title: "No se pudo regenerar",
        description: errorMessage(error),
      });
    }
  }

  async function retry(id: string) {
    try {
      state.upsert(await retryDocument(id));
    } catch (error) {
      showAlert({
        tone: "error",
        title: "No se pudo reintentar",
        description: errorMessage(error),
      });
    }
  }

  function send(document: DocumentDTO, channel?: DeliveryChannel) {
    setSending(channel === undefined ? { document } : { document, channel });
  }

  // 202: el documento vuelve con `last_delivery` puesta; la fila ya dice
  // «Enviando…». El desenlace llega por WS y `refresh` relee la verdad.
  function sent(result: SendDocumentResultDTO) {
    state.upsert(result.document);
  }

  return (
    <section aria-label="Documentos" className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Documentos
        </h3>
        {canIssue && issueSubject !== null && types !== null ? (
          <IssueDocumentMenu
            subject={issueSubject}
            subjectLabel={subjectLabel ?? "esta reserva"}
            types={types}
            documents={state.documents}
            onIssued={(document: DocumentDTO) => {
              state.upsert(document);
              void state.refresh();
            }}
          />
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {state.loading ? (
          <div
            className="space-y-3 p-4"
            role="status"
            aria-label="Cargando documentos"
          >
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-4/5" />
          </div>
        ) : state.error === "failed" ? (
          <div className="flex items-center justify-between gap-3 p-4 text-sm">
            <p className="text-muted-foreground">
              No se pudieron cargar los documentos.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => void state.refresh()}
            >
              Reintentar
            </Button>
          </div>
        ) : state.documents.length === 0 ? (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-[18px] pt-[18px] pb-5">
            <span className="relative block h-[52px] w-[44px]">
              <PaperMark
                typeCode="cuenta_cobro"
                tone="empty"
                className="absolute top-1.5 left-0"
              />
              <PaperMark
                typeCode="contract"
                tone="empty"
                className="absolute top-0 left-2 rotate-[4deg]"
              />
            </span>
            <div>
              <p className="text-[14.5px] font-medium tracking-[-0.005em]">
                {subject.kind === "contact"
                  ? "Todavía no hay papeles a su nombre"
                  : "Todavía no hay papeles de esta reserva"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {subject.kind === "contact" ? (
                  "Se emiten desde cada pedido."
                ) : canIssue ? (
                  <>
                    Emite el{" "}
                    <b className="font-medium text-foreground">contrato</b>{" "}
                    cuando quieras. El{" "}
                    <b className="font-medium text-foreground">recibo</b> puede
                    salir solo con cada pago verificado: se enciende en Mi
                    empresa › Documentos.
                  </>
                ) : (
                  "El recibo puede salir solo con cada pago verificado."
                )}
              </p>
            </div>
          </div>
        ) : (
          <>
            <ul className="m-0 list-none p-0">
              {state.documents.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  outdated={isOutdated(document, subjectUpdatedAt)}
                  regenerable={regenerable.has(document.type_code)}
                  canManage={canManage}
                  onView={view}
                  onRegenerate={regenerate}
                  onRetry={retry}
                  onSend={canManage ? send : undefined}
                />
              ))}
            </ul>
            <p className="border-t border-border/50 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
              {canManage ? (
                <>
                  Cada papel sale con los datos{" "}
                  <b className="font-medium text-foreground">de ese día</b>. Si
                  el pedido cambia después, aquí se dice. Enviarlo al cliente
                  está en «…».
                </>
              ) : (
                <>
                  Puedes abrir los papeles. Emitirlos o enviarlos es de{" "}
                  <b className="font-medium text-foreground">supervisión</b>:
                  gasta un consecutivo y le escribe al cliente.
                </>
              )}
            </p>
          </>
        )}
      </div>

      {canManage ? (
        <SendDocumentDialog
          intent={sending}
          subjectLabel={subjectLabel}
          onOpenChange={(open) => {
            if (!open) setSending(null);
          }}
          onSent={sent}
          onInFlight={() => void state.refresh()}
        />
      ) : null}
    </section>
  );
}
