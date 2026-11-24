/**
 * Mapa de iconos del menú de la consola (el dominio los nombra como string
 * lucide; el diccionario de `core/lib/icons.ts` es del menú del tenant).
 * Lo comparten la barra lateral y el buscador.
 */
import {
  Activity,
  AudioLines,
  Building2,
  CircleDollarSign,
  FlaskConical,
  HardDrive,
  Layers,
  LayoutDashboard,
  MessageCircleHeart,
  Phone,
  Plug,
  Plus,
  Receipt,
  ScrollText,
  Split,
  type LucideIcon,
} from "lucide-react";

export const NAV_ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "building-2": Building2,
  layers: Layers,
  "circle-dollar-sign": CircleDollarSign,
  "audio-lines": AudioLines,
  receipt: Receipt,
  "scroll-text": ScrollText,
  activity: Activity,
  "flask-conical": FlaskConical,
  phone: Phone,
  plug: Plug,
  "message-circle-heart": MessageCircleHeart,
  split: Split,
  "hard-drive": HardDrive,
  plus: Plus,
};
