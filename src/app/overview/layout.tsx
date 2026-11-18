import { Inter_Tight } from "next/font/google";

import { PublicAnalytics } from "@/core/analytics/ui/PublicAnalytics";

import "@/modules/overview/ui/overview.css";

/**
 * `/overview` — la presentación comercial pública (docs/plans/overview_deck_plan.md). De primer nivel, como
 * `/comenzar`: ni el mega-menú del sitio ni el shell del panel; la lámina ocupa la pantalla entera.
 *
 * Inter Tight es la letra de los subtítulos de Axi (axi-video/01-conocimiento/guias/subtitulos.md) y solo se carga
 * aquí: el resto del sitio no la usa. `.overview-stage` fija el fondo claro también con el sistema en oscuro
 * (globals.css). `PublicAnalytics`: se comparte por WhatsApp y conviene medir aperturas y clics a los CTA; no hay
 * datos de tenants en la ruta.
 */
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["500", "800"],
  variable: "--font-inter-tight",
  display: "swap",
});

export default function OverviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`overview-stage ${interTight.variable}`}>
      <PublicAnalytics />
      {children}
    </div>
  );
}
