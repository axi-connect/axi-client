import { formatBytes } from "@/core/lib/format";

/**
 * La cabecera multimedia de una plantilla de Meta (hsm-media F4): qué se puede
 * subir y con qué tope. Es el espejo de `template_header_media.ts` del servidor,
 * que es quien manda —vuelve a validar lo que llega—; aquí se comprueba ANTES
 * de subir, para que un WebP o un video de 48 MB se digan en el acto y no
 * después de esperar la subida.
 *
 * Una cabecera admite menos que un mensaje normal: Meta solo acepta JPG/PNG,
 * MP4 y PDF ahí.
 */

export type HeaderMediaKind = "image" | "video" | "document";

const MB = 1024 * 1024;

/**
 * El tope del documento es el NUESTRO (`MEDIA_MAX_BYTES` del servidor, 25 MiB),
 * no los 100 MB de Meta: más grande no cabe en nuestro almacenamiento.
 */
export const HEADER_MEDIA_RULES: Record<
  HeaderMediaKind,
  { mimes: readonly string[]; maxBytes: number; label: string; noun: string; formats: string }
> = {
  image: { mimes: ["image/jpeg", "image/png"], maxBytes: 5 * MB, label: "Imagen", noun: "la imagen", formats: "JPG o PNG" },
  video: { mimes: ["video/mp4"], maxBytes: 16 * MB, label: "Video", noun: "el video", formats: "MP4" },
  document: { mimes: ["application/pdf"], maxBytes: 25 * MB, label: "Documento", noun: "el documento", formats: "PDF" },
};

/** El `accept` del selector de archivos de esa clase. */
export function headerMediaAccept(kind: HeaderMediaKind): string {
  return HEADER_MEDIA_RULES[kind].mimes.join(",");
}

/** «JPG o PNG, hasta 5 MB»: la línea que acompaña al selector. */
export function headerMediaHint(kind: HeaderMediaKind): string {
  const rule = HEADER_MEDIA_RULES[kind];
  return `${rule.formats}, hasta ${formatBytes(rule.maxBytes)}`;
}

/** Cómo se llama el formato de un archivo, para decirlo en el error: «WebP», «MOV». */
function formatName(file: { name: string; type: string }): string {
  const extension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1];
  if (extension !== undefined) {
    const upper = extension.toUpperCase();
    return upper === "WEBP" ? "WebP" : upper;
  }
  return file.type === "" ? "de un tipo desconocido" : file.type;
}

/**
 * Por qué este archivo no sirve como cabecera de esa clase, en una frase que
 * dice qué pasó y qué hacer, o `null` si sirve.
 */
export function validateHeaderMediaFile(
  file: { name: string; type: string; size: number },
  kind: HeaderMediaKind,
): string | null {
  const rule = HEADER_MEDIA_RULES[kind];
  if (file.size === 0) return `«${file.name}» está vacío. Elige otro archivo.`;
  const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!rule.mimes.includes(mime)) {
    return `«${file.name}» es ${formatName(file)}. En la cabecera, Meta solo acepta ${rule.formats}.`;
  }
  if (file.size > rule.maxBytes) {
    return `«${file.name}» pesa ${formatBytes(file.size)}. ${capitalize(rule.noun)} de la cabecera va en ${rule.formats} y hasta ${formatBytes(rule.maxBytes)}.`;
  }
  return null;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
