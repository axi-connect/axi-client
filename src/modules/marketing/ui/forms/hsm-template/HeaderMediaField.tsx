"use client";

import { useRef, useState } from "react";
import { FileText, ImagePlus, LoaderCircle, RefreshCw, Repeat2, Trash2, Upload, Video } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatBytes } from "@/core/lib/format";
import { Button } from "@/shared/components/ui/button";
import {
  headerMediaAccept,
  headerMediaHint,
  type HeaderMediaKind,
} from "@/modules/marketing/domain/header-media";

/** El archivo que ya hay: el recién subido o el guardado con la plantilla. */
export interface HeaderMediaFile {
  fileName: string;
  mimeType: string;
  byteSize: number;
  /** Previa: el object URL local del recién elegido o la URL firmada del guardado. */
  previewUrl: string | null;
}

export type HeaderMediaStatus =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string; localUrl: string | null }
  | { kind: "error"; message: string };

const ICONS: Record<HeaderMediaKind, React.ComponentType<{ className?: string }>> = {
  image: ImagePlus,
  video: Video,
  document: FileText,
};

/** «JPG · 412 KB · lista»: el formato como lo dice una persona. */
const FORMAT_NAME: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "video/mp4": "MP4",
  "application/pdf": "PDF",
};

const PICK: Record<HeaderMediaKind, string> = {
  image: "Arrastra una imagen o elige un archivo",
  video: "Arrastra un video o elige un archivo",
  document: "Arrastra un PDF o elige un archivo",
};

/**
 * El archivo de la cabecera (maqueta F0, vista «Estados del subidor»; molde: el
 * subidor de fotos del catálogo). Se valida antes de subir —quien llama lo hace
 * en `onPick`— y el error dice qué pasó y qué hacer. Una vez subido, la frase
 * que vende D1: va en cada envío, sin elegirla otra vez.
 */
export function HeaderMediaField({
  kind,
  file,
  status,
  missingCopy,
  onPick,
  onRemove,
}: {
  kind: HeaderMediaKind;
  file: HeaderMediaFile | null;
  status: HeaderMediaStatus;
  /**
   * La plantilla trae una cabecera de medio creada fuera de axi: axi no tiene
   * el archivo y no puede reenviarlo. Se dice y se invita a subirlo.
   */
  missingCopy: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const Icon = ICONS[kind];

  function pick(files: FileList | null) {
    const picked = files?.[0];
    if (picked !== undefined) onPick(picked);
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={headerMediaAccept(kind)}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(event) => {
        pick(event.target.files);
        // Elegir el mismo archivo otra vez tiene que volver a disparar el cambio
        event.target.value = "";
      }}
    />
  );

  if (status.kind === "uploading") {
    return (
      <div className="border-border grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3 rounded-2xl border p-2.5">
        <Thumb kind={kind} url={status.localUrl} />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium">{status.fileName}</p>
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs" role="status">
            <LoaderCircle aria-hidden className="size-3.5 motion-safe:animate-spin" />
            Subiendo a Meta para la revisión…
          </p>
        </div>
      </div>
    );
  }

  if (file !== null) {
    return (
      <div className="space-y-2.5">
        <div className="border-border grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-2.5">
          <Thumb kind={kind} url={file.previewUrl} />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium" title={file.fileName}>
              {file.fileName}
            </p>
            <p className="text-muted-foreground text-xs">
              {FORMAT_NAME[file.mimeType] ?? file.mimeType} · {formatBytes(file.byteSize)} · lista
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" className="h-7 rounded-full px-2.5 text-xs" onClick={() => inputRef.current?.click()}>
              <RefreshCw aria-hidden className="size-3.5" />
              Reemplazar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Quitar el archivo de la cabecera"
              className="text-muted-foreground hover:text-destructive size-8 rounded-full"
              onClick={onRemove}
            >
              <Trash2 aria-hidden className="size-4" />
            </Button>
          </div>
          {input}
        </div>
        <p className="border-accent-violet/20 bg-accent-violet/5 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed">
          <Repeat2 aria-hidden className="text-accent-violet mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-medium">Va en cada envío.</span> Queda guardada con la plantilla: campañas, seguimientos,
            cobros y automatizaciones la mandan solas, sin que la elijas otra vez.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {missingCopy ? (
        <p className="text-muted-foreground text-xs text-pretty">
          Esta cabecera se creó fuera de axi y no tenemos su archivo, así que no saldría en los envíos. Súbelo aquí para que
          axi la mande con cada mensaje.
        </p>
      ) : null}
      <button
        id="hsm-header-media"
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          pick(event.dataTransfer.files);
        }}
        className={cn(
          "text-muted-foreground flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed px-4 py-5 text-center text-[13px] transition-colors",
          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
          dragging ? "border-foreground/40 bg-secondary" : status.kind === "error" ? "border-destructive/55" : "border-border hover:border-foreground/30",
        )}
      >
        <span aria-hidden className="bg-secondary text-foreground grid size-11 place-items-center rounded-[14px]">
          {dragging ? <Upload className="size-5" /> : <Icon className="size-5" />}
        </span>
        <span className="text-foreground font-medium">{status.kind === "error" ? `Elige otro archivo` : PICK[kind]}</span>
        <span>{headerMediaHint(kind)}</span>
      </button>
      {input}
      {status.kind === "error" ? (
        <p className="text-destructive text-xs" role="alert">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}

function Thumb({ kind, url }: { kind: HeaderMediaKind; url: string | null }) {
  if (kind === "image" && url !== null) {
    // eslint-disable-next-line @next/next/no-img-element -- previa local (object URL) o firmada que caduca
    return <img src={url} alt="" className="bg-secondary h-12 w-16 rounded-[10px] object-cover" />;
  }
  const Icon = kind === "video" ? Video : kind === "document" ? FileText : ImagePlus;
  return (
    <span aria-hidden className="bg-secondary text-muted-foreground grid h-12 w-16 place-items-center rounded-[10px]">
      <Icon className="size-5" />
    </span>
  );
}
