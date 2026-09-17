"use client";

import { Clock3, LinkIcon, PartyPopper } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { AlbaMark } from "./AlbaMark";

/**
 * Enlace inválido o caducado.
 *
 * **El copy no culpa a quien lo está leyendo.** Casi siempre es alguien que
 * hizo lo que le pidieron y llegó tarde o copió el enlace a medias; tratarlo
 * como un intento de acceso indebido es la peor primera impresión posible de un
 * producto. Y se dice explícitamente que lo ya contestado no se pierde, porque
 * la pregunta que se le viene a la cabeza es justo esa.
 */
export function SetupBlocked({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="intake-shell flex min-h-[100dvh] items-center justify-center px-6">
      <div className="relative z-10 w-full max-w-[420px] text-center">
        <span className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full border border-border bg-background shadow-float">
          <LinkIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <h1 className="text-[22px] font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </main>
  );
}

/**
 * La conversación terminó.
 *
 * Cierra con sensación de terminado y no con un aviso de sistema: quien llega
 * aquí acaba de dedicarle siete minutos a esto y merece saber que sirvió de
 * algo y qué pasa ahora. El enlace sigue vivo para volver a mirar o corregir —
 * decirlo evita el «¿y si me equivoqué en algo?» que queda flotando si no.
 */
export function SetupDone({
  closing,
  companyName,
  onReview,
}: {
  closing: string | null;
  companyName: string;
  onReview: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-[460px] text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border border-border bg-background shadow-float">
          <PartyPopper className="size-6 text-accent-violet" aria-hidden="true" />
        </span>

        <h2 className="text-[22px] leading-tight font-semibold text-foreground">
          Listo, {companyName} ya tiene lo suyo
        </h2>

        <p className="mt-3 text-[14.5px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {closing ??
            "El equipo de axi revisa lo que me contaste y lo deja aplicado en tu cuenta."}
        </p>

        <Button variant="outline" className="mt-6" onClick={onReview}>
          Revisar lo que anoté
        </Button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] text-muted-foreground/70">
          <Clock3 className="size-3" aria-hidden="true" />
          Este enlace sigue funcionando por si quieres corregir algo.
        </p>
      </div>
    </div>
  );
}

/** El esqueleto de carga. Corto a propósito: abrir el enlace no gasta IA. */
export function SetupSkeleton() {
  return (
    <main className="intake-shell flex min-h-[100dvh] items-center justify-center">
      <div className="relative z-10 flex flex-col items-center gap-3">
        <AlbaMark size={36} busy />
        <p className="text-[12.5px] text-muted-foreground">Abriendo tu conversación…</p>
      </div>
    </main>
  );
}
