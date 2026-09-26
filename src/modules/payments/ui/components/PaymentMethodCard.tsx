"use client";

import { Banknote, CreditCard, Landmark, Link2, Pencil, Smartphone, Trash2, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import {
  maskAccountNumber,
  PAYMENT_KIND_LABELS,
  type PaymentMethodDTO,
  type PaymentMethodKind,
} from "@/modules/payments/domain/payment-method";

const KIND_ICONS: Record<PaymentMethodKind, LucideIcon> = {
  nequi: Smartphone,
  daviplata: Smartphone,
  bancolombia: Landmark,
  cash: Banknote,
  pos: CreditCard,
  payment_link: Link2,
  other: Wallet,
};

/** Bajo soporte, el servidor solo deja CREAR el primer medio de cobro (editar o borrar: 403). */
export const SUPPORT_PAYMENTS_NOTE = "En soporte solo se puede dar de alta el primer medio de cobro";

/** Un medio de pago como ficha del bento (Cobros premium P2): nombre, estado, número enmascarado y datos. */
export function PaymentMethodCard({
  method,
  onEdit,
  onDelete,
  locked = false,
}: {
  method: PaymentMethodDTO;
  onEdit: (method: PaymentMethodDTO) => void;
  onDelete: (method: PaymentMethodDTO) => void;
  /** Sesión de soporte: editar y borrar no están permitidos (solo dar de alta el primero). */
  locked?: boolean;
}) {
  const Icon = KIND_ICONS[method.kind];
  const masked = maskAccountNumber(method.account_number, method.kind);
  return (
    <article
      className={cn("flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-5", method.is_active ? "" : "opacity-70")}
      aria-label={method.label}
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl",
            method.is_active ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="truncate text-base font-semibold" title={method.label}>
            {method.label}
          </h3>
          <span className="flex flex-wrap items-center gap-1.5">
            <StatePill tone={method.visible_to_ai ? "success" : "neutral"}>
              {method.visible_to_ai ? "Visible para la IA" : "Solo operadores"}
            </StatePill>
            {method.is_active ? null : <StatePill tone="neutral">Inactivo</StatePill>}
          </span>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Editar ${method.label}`}
            onClick={() => onEdit(method)}
            disabled={locked}
            title={locked ? SUPPORT_PAYMENTS_NOTE : undefined}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Eliminar ${method.label}`}
            onClick={() => onDelete(method)}
            disabled={locked}
            title={locked ? SUPPORT_PAYMENTS_NOTE : undefined}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
      <p className="truncate font-mono text-[15px] tracking-wide tabular-nums" title={masked ?? undefined}>
        {masked ?? "Sin número de cuenta"}
      </p>
      <dl className="mt-auto flex flex-col text-[13px]">
        <div className="flex justify-between gap-3 border-t border-border/60 py-2">
          <dt className="text-muted-foreground">Tipo</dt>
          <dd>{PAYMENT_KIND_LABELS[method.kind]}</dd>
        </div>
        {method.account_holder ? (
          <div className="flex justify-between gap-3 border-t border-border/60 py-2">
            <dt className="shrink-0 text-muted-foreground">A nombre de</dt>
            <dd className="min-w-0 truncate text-right" title={method.account_holder}>
              {method.account_holder}
            </dd>
          </div>
        ) : null}
        {method.instructions ? (
          <div className="flex flex-col gap-0.5 border-t border-border/60 py-2">
            <dt className="text-muted-foreground">Instrucciones</dt>
            <dd className="text-pretty">{method.instructions}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
