"use client";

import { useRef, type ReactNode } from "react";

import { cn } from "@/core/lib/utils";

/**
 * Un texto con huecos `{{variable}}`, editado con las variables a mano.
 *
 * Genérico a propósito: lo usan las reglas de marketing y las plantillas de
 * recordatorio de cobro, y en F7 los bloques de documento. Lo que comparten no
 * es el aspecto sino el problema — escribir `{{coupon_code}}` a mano es una
 * fuente de erratas que el servidor castiga con un 422, así que los chips
 * insertan la variable en la posición del cursor y nadie la teclea.
 *
 * Lo que NO hace: la vista previa. Cada sitio previsualiza lo suyo (un mensaje
 * de campaña, el hilo de una cobranza) y forzar una sola forma aquí obligaría a
 * que los dos se parecieran más de lo que son. Se pasa como `preview`.
 */
export function TemplateTextField<V extends string>({
  value,
  onChange,
  variables,
  labels,
  maxLength,
  error,
  label,
  placeholder,
  rows = 5,
  preview,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Las variables que ESTE contexto rellena de verdad. */
  variables: readonly V[];
  labels: Record<V, string>;
  maxLength: number;
  error?: string;
  /** Para lectores de pantalla: el textarea no tiene etiqueta visible. */
  label: string;
  placeholder?: string;
  rows?: number;
  preview?: ReactNode;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function insert(variable: V) {
    const token = `{{${variable}}}`;
    const el = textareaRef.current;
    if (!el) {
      onChange(`${value}${token}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(`${value.slice(0, start)}${token}${value.slice(end)}`);
    // Devuelve el cursor justo después de lo insertado: encadenar variables no
    // debería obligar a recolocarlo a mano.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const remaining = maxLength - value.length;

  const editor = (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full resize-y rounded-md border bg-background px-2.5 py-2 text-sm leading-relaxed focus:outline-none focus:ring-3 focus:ring-primary/20",
          error ? "border-destructive" : "border-input focus:border-primary",
        )}
      />

      <div className="flex flex-wrap gap-1.5">
        {variables.map((variable) => (
          <button
            key={variable}
            type="button"
            title={labels[variable]}
            onClick={() => insert(variable)}
            className="rounded-full border border-dashed border-input px-2 py-0.5 font-mono text-[0.6875rem] text-muted-foreground transition-colors hover:border-solid hover:border-primary hover:bg-accent hover:text-brand"
          >
            {`{{${variable}}}`}
          </button>
        ))}
      </div>

      {error === undefined || error === "" ? (
        <p className="text-xs tabular-nums text-muted-foreground">
          {remaining} caracteres disponibles
        </p>
      ) : (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );

  if (preview === undefined) return editor;
  return (
    <div className="grid gap-3 md:grid-cols-2 md:items-start">
      {editor}
      {preview}
    </div>
  );
}
