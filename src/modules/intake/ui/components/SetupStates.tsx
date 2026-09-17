"use client";

import { Clock3, Link as LinkIcon } from "lucide-react";

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
      <div className="relative z-10 w-full max-w-[400px] text-center">
        <span className="intake-card mx-auto mb-6 flex size-14 items-center justify-center rounded-full">
          <LinkIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.025em] text-foreground">
          {title}
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed font-light text-muted-foreground">{detail}</p>
      </div>
    </main>
  );
}

/**
 * La conversación terminó.
 *
 * Cierra con sensación de terminado y no con un aviso de sistema: quien llega
 * aquí acaba de dedicarle siete minutos a esto y merece saber que sirvió de
 * algo y qué pasa ahora. El orbe quieto, grande y centrado es el gesto: la
 * misma marca que estuvo en la cabecera todo el rato, ahora en reposo.
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
      <div className="w-full max-w-[440px] text-center">
        <AlbaMark size={56} className="mx-auto mb-6 block" />

        <h2 className="text-[26px] leading-[1.1] font-semibold tracking-[-0.03em] text-foreground text-balance">
          Listo, {companyName} ya tiene lo suyo
        </h2>

        <p className="mt-3.5 text-[15px] leading-relaxed font-light whitespace-pre-wrap text-muted-foreground">
          {closing ?? "El equipo de axi revisa lo que me contaste y lo deja aplicado en tu cuenta."}
        </p>

        <button
          type="button"
          onClick={onReview}
          className="mt-7 rounded-full bg-[var(--intake-fill)] px-5 py-2.5 text-[14px] font-medium text-foreground transition-[background-color,transform] hover:bg-[var(--intake-hair-strong)] active:scale-[.97]"
        >
          Revisar lo que anoté
        </button>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground/70">
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
      <div className="relative z-10 flex flex-col items-center gap-4">
        <AlbaMark size={40} busy />
        <p className="text-[13px] text-muted-foreground">Abriendo tu conversación…</p>
      </div>
    </main>
  );
}
