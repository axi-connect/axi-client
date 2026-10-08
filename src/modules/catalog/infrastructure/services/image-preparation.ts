import {
  UPLOAD_JPEG_QUALITY,
  UPLOAD_MAX_EDGE,
  fitWithin,
  needsReencode,
} from "@/modules/catalog/domain/product-gallery";
import { ACCEPTED_IMAGE_MIME, PRODUCT_IMAGE_MAX_BYTES } from "@/modules/catalog/domain/product";

/**
 * Reduce una foto en el navegador antes de subirla (plan
 * catalog_images_gallery, D11): borde máximo 2048 px, JPEG 0,85, orientación
 * EXIF aplicada. Una foto de celular de 4–12 MB queda en ~400–800 KB, que es
 * lo que viaja por el BFF (que bufferiza el cuerpo entero) y por la red del
 * cliente. El servidor NO confía en esto: valida magic bytes y genera sus
 * propias versiones; reducir aquí solo ahorra.
 */
export type PreparedImage = {
  file: File;
  original_bytes: number;
  prepared_bytes: number;
};

export class ImagePreparationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImagePreparationError";
  }
}

/** Costura para pruebas (jsdom no decodifica imágenes ni pinta canvas). */
export type ImageCodec = {
  decode: (file: Blob) => Promise<{ width: number; height: number; source: CanvasImageSource; close: () => void }>;
  encode: (source: CanvasImageSource, width: number, height: number, quality: number) => Promise<Blob>;
};

export const browserCodec: ImageCodec = {
  async decode(file) {
    // `from-image` aplica la rotación EXIF: la foto vertical del celular no
    // llega acostada al chat
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() };
  },
  async encode(source, width, height, quality) {
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      paint(canvas.getContext("2d"), source, width, height);
      return canvas.convertToBlob({ type: "image/jpeg", quality });
    }
    const canvas = Object.assign(document.createElement("canvas"), { width, height });
    paint(canvas.getContext("2d"), source, width, height);
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new ImagePreparationError("No pudimos preparar la foto."))),
        "image/jpeg",
        quality,
      ),
    );
  },
};

function paint(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null,
  source: CanvasImageSource,
  width: number,
  height: number,
): void {
  if (context === null) throw new ImagePreparationError("No pudimos preparar la foto en este navegador.");
  // JPEG no tiene transparencia: un PNG con fondo transparente sale sobre blanco, no sobre negro
  context.fillStyle = "white";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
}

function jpegName(name: string): string {
  return /\.[^.]+$/.test(name) ? name.replace(/\.[^.]+$/, ".jpg") : `${name}.jpg`;
}

function isSendable(file: File): boolean {
  return ACCEPTED_IMAGE_MIME.includes(file.type as (typeof ACCEPTED_IMAGE_MIME)[number]);
}

export async function prepareImageForUpload(file: File, codec: ImageCodec = browserCodec): Promise<PreparedImage> {
  let decoded: Awaited<ReturnType<ImageCodec["decode"]>>;
  try {
    decoded = await codec.decode(file);
  } catch {
    // El navegador no la sabe leer (HEIC fuera de Safari): si ya es enviable y
    // cabe, va tal cual y el servidor decide; si no, lo decimos en esa foto
    if (isSendable(file) && file.size <= PRODUCT_IMAGE_MAX_BYTES) {
      return { file, original_bytes: file.size, prepared_bytes: file.size };
    }
    throw new ImagePreparationError("Tu navegador no puede leer esta foto. Guárdala como JPG y vuelve a subirla.");
  }

  try {
    if (!needsReencode(file, decoded)) {
      return { file, original_bytes: file.size, prepared_bytes: file.size };
    }
    const target = fitWithin(decoded.width, decoded.height, UPLOAD_MAX_EDGE);
    let blob = await codec.encode(decoded.source, target.width, target.height, UPLOAD_JPEG_QUALITY);
    // Una foto con mucho detalle puede quedar pesada aun reducida: segundo intento más comprimido
    if (blob.size > PRODUCT_IMAGE_MAX_BYTES) {
      blob = await codec.encode(decoded.source, target.width, target.height, 0.7);
    }
    if (blob.size > PRODUCT_IMAGE_MAX_BYTES) {
      throw new ImagePreparationError("La foto sigue pesando más de 5 MB aun reducida.");
    }
    const prepared = new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified });
    return { file: prepared, original_bytes: file.size, prepared_bytes: prepared.size };
  } finally {
    decoded.close();
  }
}
