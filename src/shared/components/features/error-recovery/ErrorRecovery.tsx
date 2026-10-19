"use client";

import { useEffect, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { isChunkLoadError, reloadOnce } from "@/core/lib/chunk-recovery";
import { reportClientError, type ClientErrorKind } from "@/core/lib/report-client-error";

export type ErrorRecoveryProps = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Qué frontera la pinta: viaja en la telemetría para saber dónde cayó. */
  boundary: "global" | "root" | "private";
  /** Dentro del panel: sin altura de página completa, el shell sigue alrededor. */
  inline?: boolean;
};

/**
 * Lo que se ve cuando algo del cliente lanza (hotfix «Application error»,
 * docs/plans/hotfix_application_error_plan.md). Antes no había ninguna frontera
 * de error y Next pintaba «Application error: a client-side exception has
 * occurred», que se lee como «la app está caída».
 *
 * - Un chunk que no cargó (HTML de una versión anterior, red cortada) se
 *   recupera solo: una recarga, como mucho una por ventana (`reloadOnce`).
 * - Cualquier otro error se informa a la telemetría y se ofrece reintentar.
 *   Nunca se muestra el mensaje técnico; el `digest` (si lo hay) va pequeño
 *   para que soporte lo busque en los logs.
 *
 * La usan `app/global-error.tsx`, `app/error.tsx` y `app/(private)/error.tsx`.
 */
export function ErrorRecovery({ error, reset, boundary, inline = false }: ErrorRecoveryProps) {
  const chunk = isChunkLoadError(error);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    const kind: ClientErrorKind = chunk ? "chunk" : boundary === "global" ? "global" : "boundary";
    reportClientError({ kind, error, boundary });
    if (chunk && reloadOnce()) setReloading(true);
  }, [chunk, error, boundary]);

  return (
    <section
      role="alert"
      className={
        inline
          ? "flex w-full flex-col items-center justify-center px-6 py-16 text-center"
          : "flex min-h-[70vh] w-full flex-col items-center justify-center px-6 py-24 text-center"
      }
    >
      <BrandMark className="size-14 opacity-90" />

      {reloading ? (
        <p className="text-muted-foreground mt-8 text-base">Actualizando a la versión más reciente…</p>
      ) : (
        <>
          <h1 className="font-heading mt-8 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Algo no cargó bien
          </h1>
          <p className="text-muted-foreground mt-4 max-w-[52ch] text-base leading-relaxed text-pretty">
            {chunk
              ? "Publicamos una versión nueva o la conexión se cortó a mitad de camino. Recarga la página y sigue donde ibas; tu información está a salvo."
              : "Esta parte de la página tuvo un problema. Vuelve a intentarlo; tu información está a salvo."}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {chunk ? (
              <Button size="lg" onClick={() => window.location.reload()}>
                Recargar la página
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={() => reset()}>
                  Reintentar
                </Button>
                <Button size="lg" variant="outline" onClick={() => window.location.reload()}>
                  Recargar la página
                </Button>
              </>
            )}
          </div>

          {error.digest ? (
            <p className="text-muted-foreground mt-6 font-mono text-xs">Código: {error.digest}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
