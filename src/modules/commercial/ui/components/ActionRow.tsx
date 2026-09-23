"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { CommercialProposalDTO } from "@/modules/commercial/domain/commercial";
import { expiryPhrase, proposalHeadline } from "@/modules/commercial/domain/proposals";
import { StatusBadge } from "@/shared/components/features/status-badge";
import type { StatusMap } from "@/shared/components/features/status-badge/types";
import { Button } from "@/shared/components/ui/button";

export const PROPOSAL_BADGES: StatusMap = {
  pending: { label: "Por decidir", tone: "neutral" },
  approved: { label: "Aprobada", tone: "success" },
  rejected: { label: "Descartada", tone: "neutral" },
  expired: { label: "Vencida", tone: "neutral" },
  superseded: { label: "Reemplazada", tone: "neutral" },
};

export interface ActionRowProps {
  proposal: CommercialProposalDTO;
  /** El detalle (`/comercial/acciones/[id]`). La fila entera enlaza: un `<a>` estirado. */
  href: string;
  /** Sin `commercial:approve` la fila solo enlaza al detalle, de solo lectura. */
  canApprove: boolean;
  /** Aprueba desde la lista; el llamador abre el detalle con el resultado. */
  onApprove?: (id: string) => Promise<void>;
}

/**
 * Una acción propuesta: título, el titular en violeta («+2 ventas estimadas ·
 * cubre el 20 % de lo que falta para volver al ritmo») y la razón. «Aprobar»
 * siempre visible; «Ver» aparece al pasar el ratón (y siempre en táctil,
 * `.hover-reveal`). Aprobada baja de tono y ofrece «Ver qué quedó».
 *
 * La fila es un enlace ESTIRADO (el `<a>` del título cubre la fila con
 * `after:inset-0`) y los botones quedan FUERA de él, por encima: un `<button>`
 * dentro de un `<a>` no es HTML válido (M16 del mockup).
 */
export function ActionRow({ proposal, href, canApprove, onApprove }: ActionRowProps) {
  const [busy, setBusy] = useState(false);
  const settled = proposal.status !== "pending";
  const { primary } = proposalHeadline(proposal);
  const expiry = settled ? null : expiryPhrase(proposal.expires_at);

  const approve = async () => {
    if (onApprove === undefined) return;
    setBusy(true);
    try {
      await onApprove(proposal.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li
      className={cn(
        "grouped-row reveal-group relative grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-px px-4 py-3 transition-colors hover:bg-foreground/[0.03] sm:grid-cols-[minmax(0,1fr)_auto]",
        settled && "opacity-80",
      )}
      data-settled={settled}
    >
      <div className="flex min-w-0 flex-col gap-y-px">
        {settled ? (
          <span className="text-[12px]">
            <StatusBadge status={proposal.status} map={PROPOSAL_BADGES} appearance="dot" />
          </span>
        ) : null}
        <Link
          href={href}
          className="rounded-sm text-[15px] font-medium text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
        >
          {proposal.title}
        </Link>
        {primary !== null && !settled ? (
          <span className="text-[13.5px] font-medium text-accent-violet tabular-nums">{primary}</span>
        ) : null}
        <span className="text-[12.5px] text-muted-foreground">{proposal.rationale}</span>
      </div>
      {/* Por encima del enlace estirado pero SIN capturar clics: solo el botón
          los recibe; «Ver» y «Ver qué quedó» dejan pasar el clic al enlace. */}
      <div className="pointer-events-none relative z-10 mt-2 flex flex-wrap items-center gap-2 self-center sm:mt-0 sm:justify-end">
        {expiry !== null ? <StatusBadge status="expiry" map={{ expiry: { label: expiry, tone: "warning" } }} appearance="dot" /> : null}
        {settled ? (
          <span
            aria-hidden
            className="inline-flex h-8 items-center rounded-md border border-border px-3 text-[12.5px] font-medium text-foreground"
          >
            Ver qué quedó
          </span>
        ) : (
          <>
            <span className="hover-reveal inline-flex items-center gap-0.5 text-[12.5px] font-medium text-muted-foreground" aria-hidden>
              Ver
              <ChevronRight className="size-3.5" />
            </span>
            {canApprove && onApprove !== undefined ? (
              <Button
                size="sm"
                className="pointer-events-auto"
                disabled={busy}
                aria-label={`Aprobar: ${proposal.title}`}
                onClick={() => {
                  void approve();
                }}
              >
                <Check aria-hidden className="size-4" />
                Aprobar
              </Button>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}
