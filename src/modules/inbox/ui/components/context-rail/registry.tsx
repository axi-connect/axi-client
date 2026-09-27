import { History, Paperclip, PhoneCall, ShoppingBag, UserRound, type LucideIcon } from "lucide-react";
import type { ConversationDTO } from "@/modules/inbox/domain/inbox";
import { ContactPanel, useContactHeading } from "./panels/ContactPanel";
import { AttachmentsPanel, useAttachmentsCount, useAttachmentsHeading } from "./panels/AttachmentsPanel";
import { HistoryPanel, useHistoryHeading } from "./panels/HistoryPanel";
import { CallsPanel, useCallsHeading } from "./panels/CallsPanel";
import { OrdersPanel, useOrdersHeading } from "./panels/OrdersPanel";

/**
 * REGISTRY del rail de contexto — el punto de extensión de la vista.
 *
 * Añadir un item del rail es añadir una entrada aquí y su componente en
 * `panels/`: ni el rail, ni el chrome del panel, ni la URL, ni el layout se
 * tocan. El orden del array es el orden de los iconos.
 *
 * Los iconos se importan directo de `lucide-react`: el diccionario de
 * `core/lib/icons.ts` está cerrado a propósito al nav que emite el backend.
 */

export interface ContextPanelProps {
  conversation: ConversationDTO;
  contactId: string;
  /** Contador que se incrementa con los eventos WS del contacto (refresco). */
  contextVersion: number;
}

/** Cabecera del panel (F4): el `label` va de kicker; esto es el título en Nexa y su línea. */
export interface ContextPanelHeading {
  title: string;
  subtitle?: string;
}

export interface ContextPanelDef {
  /** Valor que viaja en `?panel=`; estable, es parte de la URL pública. */
  id: string;
  /** Tooltip del rail, kicker del panel y nombre accesible. */
  label: string;
  icon: LucideIcon;
  /** Permiso RBAC requerido; sin él el item no se pinta (ni su panel pide nada). */
  permission?: string;
  /** Capacidad del plan requerida (p. ej. `sales` para Pedidos); sin ella tampoco se pinta. */
  capability?: string;
  Panel: React.ComponentType<ContextPanelProps>;
  /**
   * Hook del título. El chrome monta un panel por `id` (key), así que el hook
   * que se llama es siempre el mismo durante la vida del componente.
   */
  useHeading: (props: ContextPanelProps) => ContextPanelHeading;
  /**
   * Conteo del icono del rail, solo si sale de lo que YA está en memoria (el
   * hilo): el rail no pide nada por panel cerrado.
   */
  useCount?: (props: Pick<ContextPanelProps, "conversation">) => number | null;
}

export const CONTEXT_PANELS: ContextPanelDef[] = [
  {
    id: "contact",
    label: "Contacto",
    icon: UserRound,
    permission: "contacts:read",
    Panel: ContactPanel,
    useHeading: useContactHeading,
  },
  {
    id: "attachments",
    label: "Adjuntos",
    icon: Paperclip,
    permission: "conversations:read",
    Panel: AttachmentsPanel,
    useHeading: useAttachmentsHeading,
    useCount: useAttachmentsCount,
  },
  {
    id: "history",
    label: "Historial",
    icon: History,
    permission: "crm:read",
    Panel: HistoryPanel,
    useHeading: useHistoryHeading,
  },
  {
    id: "calls",
    label: "Llamadas",
    icon: PhoneCall,
    permission: "calls:read",
    Panel: CallsPanel,
    useHeading: useCallsHeading,
  },
  {
    // D5 (lienzo F4): los pedidos del contacto, con saldo primero.
    id: "orders",
    label: "Pedidos",
    icon: ShoppingBag,
    permission: "orders:read",
    capability: "sales",
    Panel: OrdersPanel,
    useHeading: useOrdersHeading,
  },
];

/**
 * Los paneles que se ven: con su permiso y, si lo piden, su capacidad del plan.
 * Mientras no han llegado los entitlements, un panel con capacidad NO aparece
 * (ni pide nada): mejor tarde que un 403 en consola.
 */
export function visibleContextPanels(
  panels: readonly ContextPanelDef[],
  access: { hasPermission: (permission: string) => boolean; hasCapability: (capability: string) => boolean; entitlementsLoaded: boolean },
): ContextPanelDef[] {
  return panels.filter(
    (panel) =>
      (panel.permission === undefined || access.hasPermission(panel.permission)) &&
      (panel.capability === undefined || (access.entitlementsLoaded && access.hasCapability(panel.capability))),
  );
}
