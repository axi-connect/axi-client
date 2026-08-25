import {
  BadgeDollarSign,
  BellRing,
  Bot,
  Building2,
  Calendar,
  ChartLine,
  Circle,
  ClipboardList,
  Contact,
  Gauge,
  Home,
  Inbox,
  Lock,
  Megaphone,
  Mic,
  Package,
  Plug,
  Puzzle,
  ScrollText,
  Sparkles,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Target,
  Users,
  Workflow,
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
  "bell-ring": BellRing,
  bot: Bot,
  building: Building2,
  calendar: Calendar,
  "chart-line": ChartLine,
  "clipboard-list": ClipboardList,
  contact: Contact,
  gauge: Gauge,
  home: Home,
  inbox: Inbox,
  // Los cuatro siguientes son los grupos puros del árbol jerárquico
  // (Seguridad, Configuración, Ventas, Automatización).
  lock: Lock,
  megaphone: Megaphone,
  mic: Mic,
  package: Package,
  plug: Plug,
  puzzle: Puzzle,
  scroll: ScrollText,
  settings: Settings,
  // Axel, el director de mercadeo (módulo cmo). El seeder del backend lo pide
  // por este nombre; sin la entrada el ítem del sidebar caería a `Circle`.
  sparkles: Sparkles,
  shield: Shield,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  target: Target,
  users: Users,
  workflow: Workflow,
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
