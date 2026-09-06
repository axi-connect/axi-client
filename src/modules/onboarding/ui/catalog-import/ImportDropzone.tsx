"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { Sparkles, Upload } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { IMPORT_ACCEPT_ATTRIBUTE, validateImportFile } from "@/modules/onboarding/domain/catalog-import";

const EXAMPLES = ["menu.xlsx", "lista-de-precios.pdf", "foto-carta.jpg", "productos.csv"] as const;

/**
 * Zona de arrastre del catálogo (onboarding «Flow»): un archivo a la vez. Es un
 * `<button>` con un `<input type="file">` oculto, así que funciona con teclado
 * y lector de pantalla; el arrastre es el atajo, no el único camino. La
 * validación es la del dominio (extensión y tamaño); el tipo real lo decide el
 * backend. El material es el del alcance (`--sf-*`): cristal sobre el suelo,
 * borde discontinuo que se enciende al arrastrar.
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
    <div className="flex flex-col gap-3">
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
          "flex w-full flex-col items-center justify-center gap-2.5 rounded-[20px] border-[1.5px] border-dashed px-6 py-9 text-center",
          "border-[color:var(--sf-line-on)] bg-[var(--sf-glass)] transition-[background-color,border-color] duration-200",
          "hover:border-[color:var(--sf-fg)] hover:bg-[var(--sf-glass-hover)]",
          "focus-visible:border-[color:var(--sf-fg)] focus-visible:outline-none",
          dragging && "border-[color:var(--sf-fg)] bg-[var(--sf-glass-on)]",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="sf-glass-on grid size-14 place-items-center rounded-2xl border shadow-[0_8px_24px_rgb(0_0_0/.08)]">
          <Upload aria-hidden="true" className="size-6" strokeWidth={1.8} />
        </span>
        <span className="text-base font-semibold">Arrastra tu catálogo o haz clic para elegirlo</span>
        <span className="text-muted-foreground max-w-[32rem] text-[13px] leading-relaxed">
          La IA lee el archivo, arma tus productos y te pregunta solo lo que no encuentre. Excel, CSV, PDF con texto o una foto del menú, hasta 10 MB.
        </span>
        <span className="mt-1 flex flex-wrap justify-center gap-1.5" aria-hidden="true">
          {EXAMPLES.map((example) => (
            <span key={example} className="sf-glass-on sf-line text-muted-foreground rounded-full border px-2.5 py-0.5 font-mono text-[11.5px]">
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
        <p role="note" className="sf-glass border-accent-violet/30 flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-[13px] leading-relaxed">
          <Sparkles aria-hidden="true" className="text-accent-violet mt-0.5 size-4 shrink-0" />
          <span>{nicheHint}</span>
        </p>
      ) : null}
    </div>
  );
}
