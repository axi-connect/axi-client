import { errorMessage } from "@/core/lib/error-messages";
import { UPLOAD_CONCURRENCY } from "@/modules/catalog/domain/product-gallery";
import {
  ImagePreparationError,
  prepareImageForUpload,
} from "@/modules/catalog/infrastructure/services/image-preparation";
import {
  uploadProductImage,
  uploadVariantImage,
} from "@/modules/catalog/infrastructure/services/product-image-service.adapter";
import { reportQuotaExceeded } from "@/modules/storage/public";

/**
 * Cola de subida de fotos del catálogo (plan catalog_images_gallery, D11/D13).
 *
 * Cada foto pasa por: reducir en el navegador → esperar turno → subir con
 * progreso → lista. Corren de a `UPLOAD_CONCURRENCY` (reducir también ocupa
 * turno: decodificar una foto de 12 MP pesa en memoria) y una que falla no
 * frena a las demás: se reintenta sola, con su archivo ya reducido.
 *
 * Es un store de MÓDULO, no de componente, a propósito: el alta de producto
 * encola sus fotos y navega a la ficha, que sigue viendo el progreso de esas
 * mismas fotos (mockup «Las fotos se suben al crear. Puedes seguir en la
 * ficha mientras terminan»). Sobrevive a la navegación del cliente; recargar
 * la página la vacía, como cualquier subida del navegador.
 */
export type UploadStatus = "preparing" | "queued" | "uploading" | "done" | "failed";

export type UploadItem = {
  id: string;
  product_id: string;
  /** null = foto general; con valor = propia de esa variante */
  variant_id: string | null;
  file_name: string;
  /** Object URL del archivo elegido: la miniatura mientras sube */
  preview_url: string;
  status: UploadStatus;
  /** 0..1 durante `uploading` */
  progress: number;
  original_bytes: number;
  prepared_bytes: number | null;
  make_primary: boolean;
  error: string | null;
};

export type EnqueueRequest = {
  product_id: string;
  variant_id?: string | null;
  files: readonly File[];
  /** Índice dentro de `files` de la que queda como principal (o ninguna) */
  primary_index?: number | null;
};

type Job = { item: UploadItem; file: File; prepared: File | null };

type Listener = () => void;
type DoneListener = (productId: string) => void;

type QueueDeps = {
  prepare: typeof prepareImageForUpload;
  uploadProduct: typeof uploadProductImage;
  uploadVariant: typeof uploadVariantImage;
  createObjectUrl: (file: File) => string;
  revokeObjectUrl: (url: string) => void;
  concurrency: number;
  /** Fallo de subida: el 507 de espacio lleno se avisa aparte (modules/storage). */
  onError?: (error: unknown, fileName: string) => void;
};

let seq = 0;

export class PhotoUploadQueue {
  private jobs: Job[] = [];
  private snapshot: readonly UploadItem[] = [];
  private running = 0;
  private readonly listeners = new Set<Listener>();
  private readonly doneListeners = new Set<DoneListener>();

  constructor(
    private readonly deps: QueueDeps = {
      prepare: prepareImageForUpload,
      uploadProduct: uploadProductImage,
      uploadVariant: uploadVariantImage,
      createObjectUrl: (file: File) => URL.createObjectURL(file),
      revokeObjectUrl: (url: string) => URL.revokeObjectURL(url),
      concurrency: UPLOAD_CONCURRENCY,
      onError: (error, fileName) => {
        reportQuotaExceeded(error, fileName);
      },
    },
  ) {}

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): readonly UploadItem[] => this.snapshot;

  /** Cada foto que termina avisa a su producto: la ficha re-pide el detalle. */
  onUploaded(listener: DoneListener): () => void {
    this.doneListeners.add(listener);
    return () => this.doneListeners.delete(listener);
  }

  enqueue(request: EnqueueRequest): UploadItem[] {
    const added = request.files.map((file, index): Job => ({
      file,
      prepared: null,
      item: {
        id: `upload-${++seq}`,
        product_id: request.product_id,
        variant_id: request.variant_id ?? null,
        file_name: file.name,
        preview_url: this.deps.createObjectUrl(file),
        status: "queued",
        progress: 0,
        original_bytes: file.size,
        prepared_bytes: null,
        make_primary: request.primary_index === index,
        error: null,
      },
    }));
    this.jobs = [...this.jobs, ...added];
    this.publish();
    this.pump();
    return added.map((job) => job.item);
  }

  /** Reintenta SOLO esa foto; si ya estaba reducida no la vuelve a reducir. */
  retry(id: string): void {
    const job = this.jobs.find((candidate) => candidate.item.id === id);
    if (job === undefined || job.item.status !== "failed") return;
    this.update(job, { status: "queued", error: null, progress: 0 });
    this.pump();
  }

  /** Quita de la vista lo que ya terminó (cuando la galería ya trae esas fotos del servidor) o falló y se descarta. */
  dismiss(predicate: (item: UploadItem) => boolean): void {
    const [gone, kept] = partition(this.jobs, (job) => job.item.status !== "uploading" && predicate(job.item));
    if (gone.length === 0) return;
    for (const job of gone) this.deps.revokeObjectUrl(job.item.preview_url);
    this.jobs = kept;
    this.publish();
  }

  private pump(): void {
    while (this.running < this.deps.concurrency) {
      const next = this.jobs.find((job) => job.item.status === "queued");
      if (next === undefined) return;
      this.running += 1;
      void this.run(next).finally(() => {
        this.running -= 1;
        this.pump();
      });
    }
  }

  private async run(job: Job): Promise<void> {
    try {
      if (job.prepared === null) {
        this.update(job, { status: "preparing" });
        const prepared = await this.deps.prepare(job.file);
        job.prepared = prepared.file;
        this.update(job, { prepared_bytes: prepared.prepared_bytes });
      }
      this.update(job, { status: "uploading", progress: 0 });
      const input = { file: job.prepared, makePrimary: job.item.make_primary };
      const onProgress = (fraction: number) => this.update(job, { progress: fraction });
      await (job.item.variant_id === null
        ? this.deps.uploadProduct(job.item.product_id, input, { onProgress })
        : this.deps.uploadVariant(job.item.variant_id, input, { onProgress }));
      this.update(job, { status: "done", progress: 1 });
      for (const listener of this.doneListeners) listener(job.item.product_id);
    } catch (error) {
      // 507 con el espacio lleno: la miniatura dice por qué y la píldora
      // (vigía del layout) ofrece «Ver espacio» a quien administra.
      this.deps.onError?.(error, job.item.file_name);
      const message =
        error instanceof ImagePreparationError ? error.message : errorMessage(error, "No se pudo subir la foto");
      this.update(job, { status: "failed", error: message });
    }
  }

  private update(job: Job, patch: Partial<UploadItem>): void {
    job.item = { ...job.item, ...patch };
    this.publish();
  }

  private publish(): void {
    this.snapshot = this.jobs.map((job) => job.item);
    for (const listener of this.listeners) listener();
  }
}

function partition<T>(items: readonly T[], predicate: (item: T) => boolean): [T[], T[]] {
  const yes: T[] = [];
  const no: T[] = [];
  for (const item of items) (predicate(item) ? yes : no).push(item);
  return [yes, no];
}

/** La cola del panel: una para toda la sesión del navegador. */
export const photoUploadQueue = new PhotoUploadQueue();
