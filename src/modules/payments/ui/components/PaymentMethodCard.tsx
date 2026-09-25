"use client";

import { Banknote, CreditCard, Landmark, Link2, Pencil, Smartphone, Sparkles, Trash2, Wallet, type LucideIcon } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
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

/** Una fila de la lista: tipo, nombre, número enmascarado, titular y chips de estado. */
/** Bajo soporte, el servidor solo deja CREAR el primer medio de cobro (editar o borrar: 403). */
export const SUPPORT_PAYMENTS_NOTE = "En soporte solo se puede dar de alta el primer medio de cobro";

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
      className={`grid grid-cols-[40px_1fr_auto] items-start gap-3.5 rounded-2xl border border-border bg-card px-4 py-3.5 ${method.is_active ? "" : "opacity-70"}`}
      aria-label={method.label}
    >
      <div className="grid size-10 place-items-center rounded-xl bg-secondary text-foreground">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 font-medium">
          <span className="truncate">{method.label}</span>
          <span className="text-xs font-normal text-muted-foreground">{PAYMENT_KIND_LABELS[method.kind]}</span>
          {method.visible_to_ai ? (
            <Badge variant="outline" className="border-transparent bg-accent-violet/10 text-accent-violet">
              <Sparkles className="mr-1 size-3" aria-hidden />
              Visible para la IA
            </Badge>
          ) : (
            <Badge variant="secondary">Solo operadores</Badge>
          )}
          {method.is_active ? null : <Badge variant="secondary">Inactivo</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
          {masked ?? "Sin número de cuenta"}
          {method.account_holder ? ` · Titular: ${method.account_holder}` : ""}
        </p>
        {method.instructions ? <p className="mt-2 text-xs text-muted-foreground">{method.instructions}</p> : null}
      </div>
      <div className="flex gap-1">
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
    </article>
  );
}
