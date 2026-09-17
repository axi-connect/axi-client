import type * as React from "react";
import { cn } from "@/core/lib/utils";

/**
 * Franja de aviso EN LÍNEA: un icono, un tono y una frase, dentro del flujo del
 * formulario. No confundir con `notice.tsx`, que es el aviso FLOTANTE sobre el
 * contenido — de ahí que este no tenga cierre, ni portal, ni z-index.
 *
 * Estaba escrita privada dentro de `BulkFollowUpModal`, y el asistente de
 * campañas necesitaba la misma pieza para el coste y el cupo de Meta.
 *
 * Los tintes se quedan al 5–7 % con el texto en el color del cuerpo: un texto
 * del mismo color que su tinte no pasa AA en claro (DESIGN-SYSTEM §badges).
 */
const TONES = {
  info: {
    box: "border-border text-muted-foreground",
    icon: "text-info",
  },
  warn: {
    box: "border-warning/35 bg-warning/5",
    icon: "text-warning",
  },
  danger: {
    box: "border-destructive/35 bg-destructive/5",
    icon: "text-destructive",
  },
  neutral: {
    box: "border-border bg-muted/40 text-muted-foreground",
    icon: "text-muted-foreground",
  },
} as const;

export type CalloutTone = keyof typeof TONES;

export function Callout({
  tone = "info",
  icon: Icon,
  className,
  children,
}: {
  tone?: CalloutTone;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  children: React.ReactNode;
}) {
  const styles = TONES[tone];
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed",
        styles.box,
        className,
      )}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-3.5 shrink-0", styles.icon)} />
      <span>{children}</span>
    </p>
  );
}
