import type { Metadata } from "next";
import { HsmTemplatePageView } from "@/modules/marketing/ui/HsmTemplatePageView";

export const metadata: Metadata = { title: "Nueva plantilla de Meta · Configuración" };

/**
 * Crear una plantilla de Meta (hsm-media F3): página propia en vez de la modal,
 * que no tenía sitio para el mensaje y su vista previa a la vez. `?channel=`
 * llega desde la lista con el canal que estaba elegido.
 */
export default async function NewMetaTemplatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <HsmTemplatePageView channelParam={params.channel ?? null} />;
}
