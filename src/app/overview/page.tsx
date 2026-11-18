import { formatSalesWhatsApp, salesWhatsAppUrl } from "@/core/config/env";
import { pageMetadata } from "@/core/seo/metadata";
import { loadPublicCatalog } from "@/modules/landing/infrastructure/pricing-catalog.loader";
import { plansFromCatalog } from "@/modules/overview/domain/plans";
import { OverviewDeck } from "@/modules/overview/ui/OverviewDeck";

export const metadata = pageMetadata({
  title: "Overview",
  description:
    "Qué es Axi Connect, qué resuelve y cómo se ve por dentro: un agente que vende en tus canales como tu mejor vendedor, tu equipo al mando y tu meta del mes a la vista.",
  path: "/overview",
  ogTitle: "Axi Connect — Vende en cada conversación",
});

/**
 * Estática: el HTML sale del caché de Next y no hay sesión, ni proxy, ni WebSocket. La única llamada al servidor de
 * Axi es la del catálogo de precios, del lado de Next y revalidada (pricing-catalog.loader.ts); el visitante nunca le
 * pide nada al API. El diagnóstico, la lámina y el «preparado para» se leen de la URL en el cliente.
 */
export const revalidate = 3600;

/** Origen alterno de los clips para verificar en local (`<base>/<formato>/<clip>.mp4`); en producción, Cloudinary. */
const MEDIA_BASE = process.env.OVERVIEW_MEDIA_BASE || null;

export default async function OverviewPage() {
  const catalog = await loadPublicCatalog();
  return (
    <OverviewDeck
      plans={plansFromCatalog(catalog, new Date())}
      whatsappUrl={salesWhatsAppUrl("Hola, vi la presentación de Axi y quiero dejarlo funcionando en mi negocio.")}
      whatsappLabel={formatSalesWhatsApp()}
      mediaBase={MEDIA_BASE}
    />
  );
}
