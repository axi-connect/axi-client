"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { IMPORT_ACCEPT_ATTRIBUTE, validateImportFile } from "@/modules/onboarding/domain/catalog-import";

const EXAMPLES = ["menu.xlsx", "lista-de-precios.pdf", "foto-carta.jpg", "productos.csv"] as const;

/**
 * Zona de arrastre del catálogo: un archivo a la vez. Es un `<button>` con un
 * `<input type="file">` oculto, así que funciona con teclado y lector de
 * pantalla; el arrastre es el atajo, no el único camino. La validación es la
 * del dominio (extensión y tamaño); el tipo real lo decide el backend.
 */
export function ImportDropzone({
  onFile,
  disabled,
  nicheHint,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  /** Texto contextual por nicho («Para restaurantes ya creamos…»). */
  nicheHint?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const accept = (file: File | undefined) => {
    if (!file) return;
    const problem = validateImportFile(file);
    setError(problem);
    if (!problem) onFile(file);
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    accept(event.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-[1.5px] border-dashed px-6 py-10 text-center transition-colors",
          "border-foreground/20 bg-foreground/[0.02] hover:border-brand/55 hover:bg-brand/5",
          "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
          dragging && "border-brand bg-brand/8",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="channel-logo-plate grid size-13 place-items-center rounded-2xl">
          <Upload aria-hidden="true" className="text-brand size-6" />
        </span>
        <span className="font-heading text-base font-semibold">Arrastra tu catálogo o haz clic para elegirlo</span>
        <span className="text-muted-foreground max-w-[32rem] text-[0.8125rem] leading-relaxed">
          La IA lee el archivo, arma tus productos y te pregunta solo lo que no encuentre. Excel, CSV, PDF con texto o una foto del menú, hasta 10 MB.
        </span>
        <span className="mt-1 flex flex-wrap justify-center gap-1.5" aria-hidden="true">
          {EXAMPLES.map((example) => (
            <span key={example} className="border-border text-muted-foreground rounded-full border px-2 py-0.5 font-mono text-[0.6875rem]">
              {example}
            </span>
          ))}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={IMPORT_ACCEPT_ATTRIBUTE}
        className="sr-only"
        aria-label="Archivo del catálogo"
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      {nicheHint ? (
        <p role="note" className="border-accent-violet/35 bg-accent-violet/8 rounded-xl border px-4 py-3 text-sm leading-relaxed">
          {nicheHint}
        </p>
      ) : null}
    </div>
  );
}
