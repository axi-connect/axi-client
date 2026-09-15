"use client";

import Link from "next/link";
import { Calendar, ChevronRight, ShoppingCart, type LucideIcon } from "lucide-react";
import { formatDayTime, formatMoney } from "@/core/lib/format";
import type { ContactDataSession } from "@/modules/crm/domain/contact-data";
import { ContactDataGroup } from "./ContactDataGroup";

type SessionRow = {
  key: string;
  /** Sin `href` la fila es informativa (el carrito de la conversación no tiene ruta propia). */
  href: string | null;
  icon: LucideIcon;
  title: string;
  detail: string | null;
};

function buildRows(session: ContactDataSession): SessionRow[] {
  const rows: SessionRow[] = [];
  const draft = session.order_draft ?? null;
  if (draft !== null && draft.items_count > 0) {
    const items = `${draft.items_count} ${draft.items_count === 1 ? "producto" : "productos"}`;
    rows.push({
      key: "draft",
      href: null,
      icon: ShoppingCart,
      title: "Pedido en borrador",
      detail: draft.total_cents === null ? items : `${items} · ${formatMoney(draft.total_cents)}`,
    });
  }
  const lastOrder = session.last_order ?? null;
  if (lastOrder !== null) {
    rows.push({
      key: "order",
      href: `/orders/${lastOrder.order_id}`,
      icon: ShoppingCart,
      title: "Último pedido",
      detail: lastOrder.order_number === null ? null : `#${lastOrder.order_number}`,
    });
  }
  const appointment = session.last_appointment ?? null;
  if (appointment !== null) {
    rows.push({
      key: "appointment",
      href: `/scheduling/calendar/appointment/${appointment.appointment_id}`,
      icon: Calendar,
      title: "Cita",
      detail: formatDayTime(appointment.starts_at),
    });
  }
  return rows;
}

const ROW_CLASSES =
  "grid grid-cols-[20px_1fr_auto] items-center gap-2.5 rounded-md py-[9px] text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/**
 * «En esta conversación» (solo en el rail): el carrito en borrador (informativo),
 * el último pedido y la cita, como filas-enlace. Sin nada en `session`, el
 * grupo no se pinta.
 */
export function SessionLinks({ session }: { session: ContactDataSession }) {
  const rows = buildRows(session);
  if (rows.length === 0) return null;

  return (
    <ContactDataGroup label="En esta conversación" variant="rail">
      <ul className="flex flex-col">
        {rows.map((row) => {
          const Icon = row.icon;
          const content = (
            <>
              <Icon className="size-[15px] text-muted-foreground" aria-hidden />
              <span className="min-w-0 truncate">
                <b className="font-medium">{row.title}</b>
                {row.detail !== null && (
                  <small className="ml-1.5 text-[11.5px] text-muted-foreground">{row.detail}</small>
                )}
              </span>
              {row.href !== null && (
                <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
              )}
            </>
          );
          return (
            <li key={row.key} className="border-b border-border/50 last:border-b-0">
              {row.href === null ? (
                <div className={ROW_CLASSES}>{content}</div>
              ) : (
                <Link href={row.href} className={ROW_CLASSES}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </ContactDataGroup>
  );
}
