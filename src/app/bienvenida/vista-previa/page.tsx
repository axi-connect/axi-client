import type { Metadata } from "next"

import { noindexMetadata } from "@/core/seo/metadata"
import { KitPreviewReceiver } from "@/modules/platform/ui/features/delivery/KitPreviewReceiver"

/**
 * `/bienvenida/vista-previa` — el kit dentro de la pestaña «Kit» de «Preparar
 * entrega». No carga nada: pinta los datos que le pasa por `postMessage` la
 * página que lo contiene, y solo si es del mismo origen. Abierta sola, no
 * muestra nada de nadie. Va bajo `/bienvenida` para heredar las fuentes del kit
 * y sus cabeceras (`no-referrer`, `noindex`).
 */
export const metadata: Metadata = {
  ...noindexMetadata("Vista previa del kit"),
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export default function KitPreviewPage() {
  return <KitPreviewReceiver />
}
