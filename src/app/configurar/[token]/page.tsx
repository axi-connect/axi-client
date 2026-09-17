import type { Metadata } from "next";

import { SetupView } from "@/modules/intake/ui/SetupView";

/**
 * La entrevista de puesta en marcha, en un enlace público.
 *
 * **Vive fuera del panel a propósito.** Si estuviera dentro, la barrera que
 * vino a quitar seguiría intacta: entrar, recordar la contraseña, encontrar la
 * sección. Este enlace se pega en un WhatsApp y la primera pantalla ya está
 * preguntando. Lo autoriza el token de la ruta, que es el enlace mismo.
 *
 * `robots: noindex` y **el token NO se pasa a ningún metadato**: es un secreto
 * que viaja en la URL, y meterlo en un `og:url` o en un título lo dejaría en el
 * historial de cualquier previsualizador de enlaces.
 */
export const metadata: Metadata = {
  title: "Pongamos a punto tu cuenta · axi",
  description: "Cuéntanos de tu negocio y dejamos tu asistente listo.",
  robots: { index: false, follow: false },
};

export default async function ConfigurarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SetupView token={token} />;
}
