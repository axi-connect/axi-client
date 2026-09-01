import { History, Paperclip, PhoneCall, UserRound, type LucideIcon } from "lucide-react";
import type { ConversationDTO } from "@/modules/inbox/domain/inbox";
import { ContactPanel } from "./panels/ContactPanel";
import { AttachmentsPanel } from "./panels/AttachmentsPanel";
import { HistoryPanel } from "./panels/HistoryPanel";
import { CallsPanel } from "./panels/CallsPanel";

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

export interface ContextPanelDef {
  /** Valor que viaja en `?panel=`; estable, es parte de la URL pública. */
  id: string;
  /** Tooltip del rail y título del panel. */
  label: string;
  icon: LucideIcon;
  /** Permiso RBAC requerido; sin él el item no se pinta. */
  permission?: string;
  Panel: React.ComponentType<ContextPanelProps>;
}

export const CONTEXT_PANELS: ContextPanelDef[] = [
  {
    id: "contact",
    label: "Contacto",
    icon: UserRound,
    permission: "contacts:read",
    Panel: ContactPanel,
  },
  {
    id: "attachments",
    label: "Adjuntos",
    icon: Paperclip,
    permission: "conversations:read",
    Panel: AttachmentsPanel,
  },
  {
    id: "history",
    label: "Historial",
    icon: History,
    permission: "crm:read",
    Panel: HistoryPanel,
  },
  {
    id: "calls",
    label: "Llamadas",
    icon: PhoneCall,
    permission: "calls:read",
    Panel: CallsPanel,
  },
];
