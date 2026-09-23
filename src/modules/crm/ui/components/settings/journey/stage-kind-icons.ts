import {
  BadgeCheck,
  CalendarDays,
  CircleDashed,
  FileText,
  Handshake,
  HeartHandshake,
  ListChecks,
  MessageCircle,
  Sparkle,
  type LucideIcon,
} from "lucide-react";

import type { StageKind } from "@/modules/crm/domain/journey";

/**
 * Un icono por tipo de etapa. Vive en `ui/` y no en `domain/` porque los
 * iconos de lucide son componentes React y el dominio es TypeScript puro
 * (arquitectura §3.3). Lo comparten el editor del recorrido y la ficha 360.
 */
export const STAGE_KIND_ICONS: Record<StageKind, LucideIcon> = {
  new: Sparkle,
  contacted: MessageCircle,
  qualified: ListChecks,
  meeting: CalendarDays,
  proposal: FileText,
  negotiation: Handshake,
  commitment: BadgeCheck,
  fulfillment: HeartHandshake,
  custom: CircleDashed,
};
