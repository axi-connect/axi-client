"use client";

import Link from "next/link";
import { Clock, Power } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { AxelOrb } from "./AxelOrb";
import type { CmoBlocker } from "@/modules/cmo/infrastructure/stores/cmo.store";

interface CmoBlockedStateProps {
  blocker: NonNullable<CmoBlocker>;
  /** Solo quien puede aprobar puede encender a Axel. */
  canManage: boolean;
}

/**
 * Axel no está disponible. Dos motivos, dos pantallas distintas — y la
 * diferencia importa porque la salida del usuario no es la misma:
 *
 * - **`disabled`**: se arregla con un interruptor, así que la pantalla lleva el
 *   botón. Si el usuario no tiene permiso para encenderlo, se le dice a quién
 *   pedírselo en vez de mostrarle un botón que va a dar 403.
 * - **`quota`**: no se arregla hoy, se arregla el próximo ciclo. Lo que la
 *   pantalla tiene que hacer es **quitar la ansiedad**: decir explícitamente que
 *   los agentes siguen atendiendo clientes. Es la promesa central del diseño de
 *   la cuota (agotar a Axel jamás para la atención) y si la pantalla no la
 *   repite, el dueño va a asumir lo contrario.
 */
export function CmoBlockedState({ blocker, canManage }: CmoBlockedStateProps) {
  const isQuota = blocker === "quota";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <AxelOrb />
      <h2 className="mt-6 text-xl">
        {isQuota ? "Axel se quedó sin análisis este ciclo" : "Axel está apagado"}
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        {isQuota
          ? "Se agotó la cuota de análisis de tu plan. Vuelve a estar disponible al empezar el próximo ciclo de facturación."
          : "Tu director de mercadeo no está activo para esta empresa. Al encenderlo empieza a revisar tus números todos los días y a dejarte propuestas."}
      </p>

      {isQuota ? (
        <p className="mt-6 flex items-start gap-2 rounded-lg border border-success/35 bg-success/8 px-4 py-3 text-left text-xs text-success">
          <Clock className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          <span>
            Tus agentes siguen atendiendo y vendiendo con normalidad. La cuota de Axel es
            aparte justamente para que quedarte sin consejo nunca te deje sin atender.
          </span>
        </p>
      ) : null}

      {canManage ? (
        <Button asChild className="mt-6">
          <Link href="/cmo/settings">
            <Power className="size-4" aria-hidden="true" />
            {isQuota ? "Ver la configuración" : "Encender a Axel"}
          </Link>
        </Button>
      ) : (
        <p className="mt-6 text-xs text-muted-foreground">
          Pídele a un administrador de la empresa que lo active.
        </p>
      )}
    </div>
  );
}
