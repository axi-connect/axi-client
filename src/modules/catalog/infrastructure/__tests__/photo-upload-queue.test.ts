import { PhotoUploadQueue } from "../stores/photo-upload-queue";
import { ImagePreparationError, prepareImageForUpload, type ImageCodec } from "../services/image-preparation";
import type { ProductImageDTO } from "@/modules/catalog/domain/product";

jest.mock("@/modules/catalog/infrastructure/services/product-image-service.adapter", () => ({
  uploadProductImage: jest.fn(),
  uploadVariantImage: jest.fn(),
}));

function file(name: string, size = 8 * 1024 * 1024, type = "image/jpeg"): File {
  const value = new File(["x"], name, { type });
  Object.defineProperty(value, "size", { value: size });
  return value;
}

type Deferred = { resolve: () => void; reject: (error: Error) => void };

/** Cola con dependencias falsas: cada subida queda pendiente hasta que la prueba la resuelve. */
function makeQueue(concurrency = 3) {
  const uploads: { productId: string; variantId: string | null; makePrimary: boolean; name: string; deferred: Deferred }[] = [];
  const upload =
    (variant: boolean) =>
    (containerId: string, input: { file: File; makePrimary?: boolean }) =>
      new Promise<ProductImageDTO>((resolve, reject) => {
        uploads.push({
          productId: variant ? "" : containerId,
          variantId: variant ? containerId : null,
          makePrimary: input.makePrimary === true,
          name: input.file.name,
          deferred: { resolve: () => resolve({} as ProductImageDTO), reject },
        });
      });
  const queue = new PhotoUploadQueue({
    prepare: (input: File) =>
      Promise.resolve({ file: new File(["y"], input.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }), original_bytes: input.size, prepared_bytes: 640 * 1024 }),
    uploadProduct: upload(false),
    uploadVariant: upload(true),
    createObjectUrl: (input: File) => `blob:${input.name}`,
    revokeObjectUrl: () => undefined,
    concurrency,
  });
  return { queue, uploads };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("PhotoUploadQueue (D11: de a 3, progreso y reintento por foto)", () => {
  it("sube de a 3: la cuarta espera turno", async () => {
    const { queue, uploads } = makeQueue();
    queue.enqueue({ product_id: "p1", files: [file("1.jpg"), file("2.jpg"), file("3.jpg"), file("4.jpg")] });
    await flush();

    expect(uploads).toHaveLength(3);
    expect(queue.getSnapshot().map((item) => item.status)).toEqual(["uploading", "uploading", "uploading", "queued"]);

    uploads[0].deferred.resolve();
    await flush();
    await flush();
    expect(uploads).toHaveLength(4);
  });

  it("marca la principal elegida y sube a la variante cuando se pide", async () => {
    const { queue, uploads } = makeQueue();
    queue.enqueue({ product_id: "p1", files: [file("a.jpg"), file("b.jpg")], primary_index: 1 });
    queue.enqueue({ product_id: "p1", variant_id: "v-m", files: [file("m.jpg")], primary_index: 0 });
    await flush();

    expect(uploads.map((row) => [row.name, row.makePrimary, row.variantId])).toEqual([
      ["a.jpg", false, null],
      ["b.jpg", true, null],
      ["m.jpg", true, "v-m"],
    ]);
  });

  it("registra la reducción y avisa al producto al terminar cada una", async () => {
    const { queue, uploads } = makeQueue();
    const done: string[] = [];
    queue.onUploaded((productId) => done.push(productId));
    queue.enqueue({ product_id: "p1", files: [file("IMG.HEIC", 8 * 1024 * 1024, "image/heic")] });
    await flush();

    expect(uploads[0].name).toBe("IMG.jpg");
    expect(queue.getSnapshot()[0]).toMatchObject({ original_bytes: 8 * 1024 * 1024, prepared_bytes: 640 * 1024 });
    uploads[0].deferred.resolve();
    await flush();
    expect(queue.getSnapshot()[0].status).toBe("done");
    expect(done).toEqual(["p1"]);
  });

  it("una que falla no frena a las demás y se reintenta sola, sin volver a reducir", async () => {
    const { queue, uploads } = makeQueue(1);
    queue.enqueue({ product_id: "p1", files: [file("rota.jpg"), file("bien.jpg")] });
    await flush();

    uploads[0].deferred.reject(new Error("se cortó la conexión"));
    await flush();
    await flush();
    const [rota, bien] = queue.getSnapshot();
    expect(rota.status).toBe("failed");
    expect(bien.status).toBe("uploading");

    uploads[1].deferred.resolve();
    await flush();
    queue.retry(rota.id);
    await flush();
    expect(uploads).toHaveLength(3);
    expect(uploads[2].name).toBe("rota.jpg");
  });

  it("dismiss quita lo terminado pero nunca lo que está subiendo", async () => {
    const { queue, uploads } = makeQueue();
    queue.enqueue({ product_id: "p1", files: [file("a.jpg"), file("b.jpg")] });
    await flush();
    uploads[0].deferred.resolve();
    await flush();

    queue.dismiss(() => true);
    expect(queue.getSnapshot().map((item) => item.file_name)).toEqual(["b.jpg"]);
  });
});

describe("prepareImageForUpload (con un codec falso: jsdom no decodifica)", () => {
  const codec = (width: number, height: number, outBytes: number, decodes = true) => {
    const encode = jest.fn<Promise<Blob>, Parameters<ImageCodec["encode"]>>(() =>
      Promise.resolve(new Blob([new Uint8Array(outBytes)], { type: "image/jpeg" })),
    );
    const value: ImageCodec = {
      decode: () =>
        decodes
          ? Promise.resolve({ width, height, source: {} as CanvasImageSource, close: () => undefined })
          : Promise.reject(new Error("no decodifica")),
      encode,
    };
    return { value, encode };
  };

  it("reduce una foto de celular a 2048 px en JPEG y la renombra", async () => {
    const { value, encode } = codec(4032, 3024, 640 * 1024);
    const prepared = await prepareImageForUpload(file("IMG_4025.HEIC", 8 * 1024 * 1024, "image/heic"), value);

    expect(encode).toHaveBeenCalledWith(expect.anything(), 2048, 1536, 0.85);
    expect(prepared.file.name).toBe("IMG_4025.jpg");
    expect(prepared.file.type).toBe("image/jpeg");
    expect(prepared).toMatchObject({ original_bytes: 8 * 1024 * 1024, prepared_bytes: 640 * 1024 });
  });

  it("un JPEG liviano que cabe se sube tal cual (sin perder calidad)", async () => {
    const { value, encode } = codec(1200, 900, 1);
    const original = file("chica.jpg", 400 * 1024);
    const prepared = await prepareImageForUpload(original, value);

    expect(encode).not.toHaveBeenCalled();
    expect(prepared.file).toBe(original);
  });

  it("si el navegador no la sabe leer: enviable y liviana va tal cual; HEIC dice qué hacer", async () => {
    const { value } = codec(0, 0, 0, false);
    const jpeg = file("rara.jpg", 1024 * 1024);
    expect((await prepareImageForUpload(jpeg, value)).file).toBe(jpeg);
    await expect(prepareImageForUpload(file("IMG.HEIC", 3 * 1024 * 1024, "image/heic"), value)).rejects.toBeInstanceOf(
      ImagePreparationError,
    );
  });

  it("reducida y aún pesada: segundo intento más comprimido; si sigue pasando de 5 MB, falla esa foto", async () => {
    const { value, encode } = codec(4000, 4000, 6 * 1024 * 1024);
    await expect(prepareImageForUpload(file("detalle.png", 20 * 1024 * 1024, "image/png"), value)).rejects.toThrow(/5 MB/);
    expect(encode.mock.calls.map((call) => call[3])).toEqual([0.85, 0.7]);
  });
});
