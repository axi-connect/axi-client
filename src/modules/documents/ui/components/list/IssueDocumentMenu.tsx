"use client";

import { useState } from "react";
import { ArrowRight, CircleCheck, Plus } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  issueOptions,
  type DocumentDTO,
  type IssueSubject,
} from "@/modules/documents/domain/document";
import type { DocumentTypeView } from "@/modules/documents/domain/template";
import { issueDocument } from "@/modules/documents/infrastructure/services/documents-service.adapter";
import { PaperMark } from "./PaperMark";

/**
 * Lo que el menú dice de cada política, como mapa EXHAUSTIVO sobre el enum del
 * wire: si el servidor añade una política, esto no compila hasta decidir qué
 * decirle a la persona.
 */
const ISSUE_POLICY_HINT: Record<DocumentTypeView["issue_policy"], string> = {
  once: "Con los datos de hoy · uno por entidad",
  many: "Con los datos de hoy",
};

/**
 * «Emitir» (F8 Cobros): la única acción coral de la sección. Ofrece SOLO lo
 * que el catálogo declara emitible a mano sobre esta entidad; el recibo no
 * aparece para un pedido porque sale solo con cada pago. Lo que ya existe se
 * dice con su número —«uno por reserva»— en vez de duplicarse: es la
 * idempotencia del servidor, contada antes del clic.
 */
export function IssueDocumentMenu({
  subject,
  subjectLabel,
  types,
  documents,
  onIssued,
}: {
  subject: IssueSubject;
  /** «la reserva JX-0042»: el encabezado del menú. */
  subjectLabel: string;
  types: readonly DocumentTypeView[];
  documents: readonly DocumentDTO[];
  onIssued: (document: DocumentDTO) => void;
}) {
  const { showAlert } = useAlert();
  const [issuing, setIssuing] = useState<string | null>(null);
  const options = issueOptions(types, subject, documents);
  if (options.length === 0) return null;

  async function issue(typeCode: string, label: string) {
    setIssuing(typeCode);
    try {
      const result = await issueDocument(typeCode, subject);
      if (result.deduplicated) {
        showAlert({
          tone: "info",
          title: `${label} ya existe: ${result.document.number}`,
          description:
            "Es uno por entidad. Si cambió algo, regenéralo desde su fila.",
          autoCloseMs: 4000,
        });
      } else {
        showAlert({
          tone: "success",
          title: `${label} ${result.document.number} en camino`,
          description: "El PDF tarda unos segundos; la fila avisa cuando está.",
          autoCloseMs: 3000,
        });
      }
      onIssued(result.document);
    } catch (error) {
      showAlert({
        tone: "error",
        title: errorMessage(error, `No se pudo emitir ${label.toLowerCase()}`),
      });
    } finally {
      setIssuing(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 rounded-full px-2.5 text-xs"
          disabled={issuing !== null}
        >
          <Plus className="size-3.5" /> Emitir
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[340px] rounded-2xl p-2">
        <DropdownMenuLabel>Emitir para {subjectLabel}</DropdownMenuLabel>
        {options.map(({ type, existing }) => (
          <DropdownMenuItem
            key={type.code}
            className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5"
            onClick={() => {
              if (existing === null) void issue(type.code, type.label);
            }}
          >
            <PaperMark typeCode={type.code} />
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-medium">
                {type.label}
                {existing !== null ? (
                  <CircleCheck
                    aria-hidden="true"
                    className="size-3.5 text-success"
                  />
                ) : null}
              </span>
              <span className="block text-xs text-muted-foreground">
                {existing !== null
                  ? "Ya emitido · uno por entidad"
                  : ISSUE_POLICY_HINT[type.issue_policy]}
              </span>
            </span>
            <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground tabular-nums">
              {existing !== null ? (
                <span className="text-foreground">{existing.number}</span>
              ) : (
                <ArrowRight aria-hidden="true" className="size-3 opacity-60" />
              )}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-3 pt-1 pb-1.5 text-xs leading-relaxed text-muted-foreground">
          El <b className="font-medium text-foreground">recibo</b> no se emite a
          mano: sale solo con cada pago verificado. El PDF tarda unos segundos;
          la fila avisa cuando está.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
