import {
  BadgeDollarSign,
  Bot,
  Building2,
  Calendar,
  ChartLine,
  Circle,
  Contact,
  Gauge,
  Home,
  Inbox,
  Package,
  Plug,
  ScrollText,
  Shield,
  ShoppingCart,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Mapa explícito de los nombres de icono que emite el backend en
 * `GET /me/navigation` (seed de `rbac_ui_module`) → componentes lucide.
 * Diccionario cerrado a propósito: mantiene el tree-shaking (no se importa
 * todo lucide) y hace visible cualquier icono nuevo del backend.
 */
const NAV_ICONS: Record<string, LucideIcon> = {
  "badge-dollar-sign": BadgeDollarSign,
  bot: Bot,
  building: Building2,
  calendar: Calendar,
  "chart-line": ChartLine,
  contact: Contact,
  gauge: Gauge,
  home: Home,
  inbox: Inbox,
  package: Package,
  plug: Plug,
  scroll: ScrollText,
  shield: Shield,
  "shopping-cart": ShoppingCart,
  users: Users,
  zap: Zap,
};

/** Icono de fallback cuando el backend emite un nombre desconocido. */
const FALLBACK_ICON: LucideIcon = Circle;

export function iconFromString(name: string | null | undefined): LucideIcon {
  if (!name) return FALLBACK_ICON;
  const icon = NAV_ICONS[name.toLowerCase()];
  if (!icon && process.env.NODE_ENV !== "production") {
    console.warn(`[sidebar] Icono desconocido del backend: "${name}" — usando fallback`);
  }
  return icon ?? FALLBACK_ICON;
}

/** Assets de icono externos (Cloudinary) usados por la UI del inbox. */
export const icons = {
  MESSAGE: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1761950324/message_lhryyf.svg",
};
