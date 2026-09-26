"use client";

import { useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";

/**
 * Piezas compartidas del marketing premium (canvas 2026-09-26). Sustituyen a las
 * copias a mano que había en cada vista: la tarjeta de error
 * (`border-destructive/35 bg-destructive/5`, cuatro veces) y los contenedores de
 * tabla (`rounded-2xl border`, seis veces).
 */

/** Lo que no se pudo leer, dicho en su sitio y con reintento. Un error nunca se pinta como un vacío. */
export function LoadError({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry: () => void | Promise<void>;
  className?: string;
}) {
  const [retrying, setRetrying] = useState(false);
  return (
    <div
      role="alert"
      className={cn("border-border bg-card flex flex-wrap items-center gap-x-4 gap-y-3 rounded-3xl border p-5", className)}
    >
      <span aria-hidden="true" className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl">
        <AlertCircle className="size-4.5" />
      </span>
      <p className="min-w-0 flex-1 text-sm text-pretty">{message}</p>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full px-4"
        disabled={retrying}
        onClick={() => {
          setRetrying(true);
          void Promise.resolve(onRetry()).finally(() => setRetrying(false));
        }}
      >
        {retrying ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
        Reintentar
      </Button>
    </div>
  );
}

/**
 * La tarjeta de una tabla del módulo: el cuerpo del bento (`rounded-3xl`, sin
 * sombra: contenido en página, §4.3). La tabla de dentro trae su propio scroll
 * horizontal (`ui/table.tsx`): la tarjeta recorta, la página no se mueve.
 *
 * Es un `@container`: las columnas secundarias se muestran según el ancho de
 * la TABLA (`@xl:table-cell`, `@2xl:table-cell`…), no de la pantalla. A 1024 px
 * con el menú abierto la tabla mide ~720 px: con cortes por viewport salían
 * todas las columnas y los nombres se partían en tres líneas.
 */
export function TableCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("border-border bg-card @container min-w-0 overflow-hidden rounded-3xl border", className)}>
      {children}
    </section>
  );
}

/** Cabecera de tabla del módulo: etiqueta pequeña, sin versalitas (las del canvas). */
export const TH = "text-muted-foreground h-11 px-4 text-xs font-medium first:pl-5 last:pr-5";
/** Celda de tabla del módulo. */
export const TD = "px-4 py-3.5 first:pl-5 last:pr-5";
