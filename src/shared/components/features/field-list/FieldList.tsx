"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/core/lib/utils";

/**
 * Lista de definición etiqueta → valor (`<dl>`), la forma canónica de pintar
 * datos de una entidad en rails, cards de detalle y paneles de contexto.
 *
 * Sustituye los `<dl>` ad-hoc que estaban copiados por módulo. Los campos sin
 * valor se omiten por defecto: los DTO del backend traen casi todo nullable y
 * un panel lleno de guiones no informa de nada.
 */

export interface FieldItem {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Valor crudo a copiar; muestra el botón de copiado junto al valor. */
  copyable?: string;
  /** Pinta el valor debajo de la etiqueta (para textos largos o multilínea). */
  block?: boolean;
  /** Oculta la fila si el valor está vacío. `true` por defecto. */
  hideWhenEmpty?: boolean;
}

/** Vacío = sin dato que mostrar. No trata `0` ni `false` como vacío. */
function isEmptyValue(value: React.ReactNode): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

function CopyButton({ value, label }: { value: string; label: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label={typeof label === "string" ? `Copiar ${label.toLowerCase()}` : "Copiar"}
      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? (
        <Check className="size-3.5 text-success" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
    </button>
  );
}

export function FieldList({
  items,
  layout = "rows",
  className,
}: {
  items: FieldItem[];
  /**
   * `rows`: etiqueta a la izquierda y valor a la derecha (rails estrechos).
   * `grid`: dos columnas en `sm+`, apilado en móvil (cards anchas).
   */
  layout?: "rows" | "grid";
  className?: string;
}) {
  const visible = items.filter(
    (item) => !(item.hideWhenEmpty ?? true) || !isEmptyValue(item.value),
  );
  if (visible.length === 0) return null;

  return (
    <dl
      className={cn(
        "text-sm",
        layout === "grid" ? "grid gap-x-6 gap-y-2 sm:grid-cols-2" : "space-y-2",
        className,
      )}
    >
      {visible.map((item, index) => (
        <div
          key={index}
          className={cn(
            "gap-2",
            item.block === true
              ? "space-y-0.5"
              : layout === "grid"
                ? "flex justify-between gap-3 sm:block"
                : "flex items-start justify-between",
          )}
        >
          <dt className="shrink-0 text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "min-w-0",
              item.block === true
                ? "break-words"
                : "flex items-center gap-1.5 text-right",
            )}
          >
            <span className={cn(item.block !== true && "min-w-0 truncate")}>{item.value}</span>
            {item.copyable !== undefined && item.copyable !== "" && (
              <CopyButton value={item.copyable} label={item.label} />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
