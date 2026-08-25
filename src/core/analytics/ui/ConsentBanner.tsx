"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { readConsent, writeConsent } from "@/core/analytics/consent";

/**
 * Barra de consentimiento. Deliberadamente pequeña: una sola decisión, sin
 * capa que bloquee la página y sin bloquear el scroll. El visitante que viene a
 * ver el producto tiene que poder verlo.
 *
 * No se usa un gestor de consentimiento de terceros (Cookiebot y similares):
 * son decenas de kilobytes, una suscripción y un tercero más al que auditar,
 * para un sitio que hace una única pregunta.
 */
export function ConsentBanner() {
  // `null` mientras no se sabe: evita que el banner parpadee en la hidratación
  // para quien ya respondió, y evita el desajuste servidor/cliente.
  const [decided, setDecided] = useState<boolean | null>(null);

  useEffect(() => {
    setDecided(readConsent() !== null);
  }, []);

  if (decided !== false) return null;

  const decide = (status: "granted" | "denied") => {
    writeConsent(status);
    setDecided(true);
  };

  return (
    <div
      role="region"
      aria-label="Consentimiento de cookies"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="border-border/60 bg-background/95 mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:gap-4">
        <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
          Usamos cookies propias y de terceros para medir el uso del sitio y mostrarte
          publicidad relevante. Puedes rechazarlas sin perder ninguna función.{" "}
          <Link href="/legal/privacidad" className="text-brand font-medium hover:underline">
            Más información
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => decide("denied")}>
            Rechazar
          </Button>
          <Button size="sm" onClick={() => decide("granted")}>
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
}
