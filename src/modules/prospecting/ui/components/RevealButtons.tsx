"use client";

import { Check, LoaderCircle } from "lucide-react";

import { StatePill } from "@/shared/components/features/bento";
import { cn } from "@/core/lib/utils";

import type { RevealCosts } from "../../domain/person";

export interface RevealTarget {
  id: string;
  masked: boolean;
  /** Solo se revela lo que viene de Apollo. */
  revealable: boolean;
  email: string | null;
  phone: string | null;
  has_email: boolean;
  has_phone: boolean;
  in_crm: boolean;
}

/**
 * Los botones de revelar de una persona (tableros 5 y 5b).
 *
 * Cada uno dice lo que cuesta ANTES de pulsarlo («Correo 1», «Celular 8») y se
 * apaga cuando Apollo dice que no lo tiene: pagar por nada no es una opción que
 * se ofrezca. Revelado, el dato ocupa el sitio del botón. El celular llega
 * minutos después: mientras tanto, «Esperando a Apollo…».
 */
export function RevealButtons({
  target,
  busy,
  waitingPhone,
  onReveal,
  disabled,
  costs,
}: {
  target: RevealTarget;
  costs: RevealCosts;
  busy: boolean;
  waitingPhone: boolean;
  onReveal: (fields: ("email" | "phone")[]) => void;
  disabled?: boolean;
}) {
  if (target.in_crm) {
    return <StatePill tone="success">Ya en tu CRM</StatePill>;
  }

  const emailButton =
    target.email !== null ? (
      <span
        className="border-success/50 text-foreground inline-flex h-7 max-w-56 items-center gap-1.5 truncate rounded-full border px-2.5 text-xs font-medium"
        title={target.email}
      >
        <Check aria-hidden className="text-success size-3.5 shrink-0" />
        <span className="truncate">{target.email}</span>
      </span>
    ) : target.revealable ? (
      <CostButton
        label="Correo"
        credits={costs.email}
        available={target.has_email}
        busy={busy}
        disabled={disabled}
        onClick={() => onReveal(["email"])}
        unavailableLabel="Apollo no tiene su correo"
      />
    ) : null;

  const phoneButton =
    target.phone !== null ? (
      <span className="border-success/50 inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap tabular-nums">
        <Check aria-hidden className="text-success size-3.5 shrink-0" />
        {target.phone}
      </span>
    ) : waitingPhone ? (
      <span
        role="status"
        className="border-border text-muted-foreground inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed px-2.5 text-xs whitespace-nowrap"
      >
        <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />
        Esperando a Apollo…
      </span>
    ) : target.revealable ? (
      <CostButton
        label="Celular"
        credits={costs.phone}
        available={target.has_phone}
        busy={busy}
        disabled={disabled}
        onClick={() => onReveal(["email", "phone"])}
        unavailableLabel="Apollo no tiene su celular"
      />
    ) : null;

  if (emailButton === null && phoneButton === null) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {emailButton}
      {phoneButton}
    </div>
  );
}

function CostButton({
  label,
  credits,
  available,
  busy,
  disabled,
  onClick,
  unavailableLabel,
}: {
  label: string;
  credits: number | null;
  available: boolean;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
  unavailableLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!available || busy || disabled === true}
      aria-label={
        available
          ? credits === null
            ? `Revelar ${label.toLowerCase()}`
            : `Revelar ${label.toLowerCase()} · ${String(credits)} ${credits === 1 ? "crédito" : "créditos"}`
          : unavailableLabel
      }
      title={available ? undefined : unavailableLabel}
      className={cn(
        "border-border bg-card text-foreground focus-visible:ring-ring inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
        "hover:bg-accent focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {busy && <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />}
      {label}
      <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
        {available && credits !== null ? String(credits) : "–"}
      </span>
    </button>
  );
}
