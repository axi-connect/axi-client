import type { Metadata } from "next";
import { HsmTemplatePageView } from "@/modules/marketing/ui/HsmTemplatePageView";

export const metadata: Metadata = { title: "Editar plantilla de Meta · Configuración" };

/**
 * Editar o corregir una plantilla de Meta (hsm-media F3). La `key` remonta el
 * formulario al pasar de una plantilla a otra, que es lo que carga sus valores
 * sin un efecto que sincronice estado con props.
 */
export default async function EditMetaTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <HsmTemplatePageView key={id} templateId={id} channelParam={query.channel ?? null} />;
}
