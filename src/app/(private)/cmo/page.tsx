import { CmoView } from "@/modules/cmo/ui/CmoView";

/**
 * El despacho de Axel. Sin wrapper: `CmoView` es directamente el ítem flex del
 * shell y reparte con `flex-1` — un `<div className="h-full">` intermedio
 * resolvería a `auto` y devolvería el scroll al panel (DESIGN-SYSTEM §4.2).
 */
export default function CmoPage() {
  return <CmoView />;
}
