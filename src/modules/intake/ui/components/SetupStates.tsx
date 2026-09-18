"use client";

import { Clock3 } from "lucide-react";

import type { IntakeSummary } from "@/modules/intake/domain/intake";
import { AssistantAvatar, AssistantStage, type AssistantExpressionName } from "@/shared/components/features/assistant";
import { ALBA_ACCESSORY } from "./AlbaHeroAvatar";
import { SetupNextSteps } from "./SetupNextSteps";

/** Alba quieta, con una expresión fija: sin botón, sin mirada, sin vida. */
function AlbaStill({ expression, busy = false, label }: { expression: AssistantExpressionName; busy?: boolean; label: string }) {
  return (
    <div role="img" aria-label={label} data-mood={expression} className="mx-auto">
      <AssistantStage busy={busy}>
        <AssistantAvatar expression={expression} accessory={ALBA_ACCESSORY} transitionMs={0} />
      </AssistantStage>
    </div>
  );
}

/**
 * Enlace inválido o caducado.
 *
 * **El copy no culpa a quien lo está leyendo.** Casi siempre es alguien que
 * hizo lo que le pidieron y llegó tarde o copió el enlace a medias; tratarlo
 * como un intento de acceso indebido es la peor primera impresión posible de un
 * producto. Alba dormida dice lo mismo sin una palabra.
 */
export function SetupBlocked({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="assistant-field flex min-h-[100dvh] items-center justify-center px-6">
      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center text-center">
        <AlbaStill expression="asleep" label="Alba, dormida" />
        <h1 className="font-heading mt-5 text-[24px] leading-tight font-bold tracking-[-0.02em] text-foreground text-balance">
          {title}
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </main>
  );
}

/**
 * La conversación terminó.
 *
 * Cierra con sensación de terminado y no con un aviso de sistema: quien llega
 * aquí acaba de dedicarle siete minutos a esto y merece saber que sirvió de
 * algo y qué pasa ahora. Alba orgullosa, grande y centrada es el gesto.
 */
export function SetupDone({
  closing,
  summary,
  companyName,
  assistantName,
  onReview,
}: {
  closing: string | null;
  /** Qué queda listo, qué pone la persona y qué falta. Lo calcula el servidor. */
  summary: IntakeSummary | null;
  companyName: string;
  assistantName: string;
  onReview: () => void;
}) {
  return (
    // La pantalla crece con el resumen: se desplaza en vez de recortarse.
    <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 py-10">
      <div className="my-auto flex w-full max-w-[480px] flex-col items-center text-center">
        <AlbaStill expression="proud" label={`${assistantName}, orgullosa`} />

        <h2 className="font-heading mt-5 text-[26px] leading-[1.1] font-bold tracking-[-0.02em] text-foreground text-balance">
          Listo, {companyName} ya tiene lo suyo
        </h2>

        <p className="mt-3.5 max-w-[440px] text-[15px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {closing ?? "El equipo de axi revisa lo que me contaste y lo deja aplicado en tu cuenta."}
        </p>

        {summary === null ? null : <SetupNextSteps summary={summary} className="mt-[26px]" />}

        <button
          type="button"
          onClick={onReview}
          className="mt-7 rounded-full bg-brand/10 px-5 py-2.5 text-[14px] font-semibold text-brand transition-[background-color,transform] hover:bg-brand/15 active:scale-[.97]"
        >
          Revisar lo que anoté
        </button>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground/70">
          <Clock3 className="size-3" aria-hidden="true" />
          Puedes volver a este enlace para repasar lo que anotamos.
        </p>
      </div>
    </div>
  );
}

/** El esqueleto de carga. Corto a propósito: abrir el enlace no gasta IA. */
export function SetupSkeleton() {
  return (
    <main className="assistant-field flex min-h-[100dvh] items-center justify-center">
      <div className="relative z-10 flex flex-col items-center gap-4">
        <AlbaStill expression="neutral" busy label="Alba, abriendo tu conversación" />
        <p className="text-[13px] text-muted-foreground">Abriendo tu conversación…</p>
      </div>
    </main>
  );
}
