import { CalendarClock, Phone, Radar, Users, type LucideIcon } from "lucide-react";

import type { ModuleId } from "@/modules/landing/ui/content/landing.content";

/**
 * Icono de cada Módulo. Mapa cerrado por `id` a propósito: un nombre de icono
 * en el content obligaría a un diccionario dinámico y a arrastrar todo lucide.
 *
 * Vive fuera de `ModuleCard` porque lo publica el barril del slice: exportarlo
 * desde el componente arrastraba a `/comenzar` la tarjeta entera (TiltCard y
 * framer-motion) solo para leer cuatro iconos.
 */
export const MODULE_ICONS: Record<ModuleId, LucideIcon> = {
  calls: Phone,
  leads: Radar,
  crm: Users,
  scheduling: CalendarClock,
};
