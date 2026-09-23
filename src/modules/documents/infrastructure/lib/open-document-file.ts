import { getDocumentFileUrl } from "@/modules/documents/infrastructure/services/documents-service.adapter";

/**
 * Abre el PDF en una pestaña nueva con una URL firmada FRESCA (patrón de los
 * adjuntos del inbox): la firma dura cinco minutos, así que un enlace guardado
 * de ayer no sirve y por eso no se guarda. `noopener`: la pestaña del PDF no
 * puede tocar la del panel.
 *
 * Nunca fetch-blob: el navegador descarga directo del storage sin pasar los
 * bytes por la API.
 */
export async function openDocumentFile(documentId: string): Promise<void> {
  const { url } = await getDocumentFileUrl(documentId);
  window.open(url, "_blank", "noopener");
}
