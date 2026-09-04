"use client";

import { CreditCard } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { PRICING_VOLUMES, type VolumeId } from "@/modules/landing/ui/content/landing.content";

/**
 * Rail de la sección de precios: el marco que aplica a los tres paquetes.
 *
 * Aquí vive la prueba gratuita —que **dejó de ser tarjeta** (2026-09-04)—
 * porque aplica a los tres y una cuarta tarjeta la hacía parecer una opción
 * excluyente en vez de la puerta de entrada de todas.
 *
 * NO lleva ni borde ni sombra, a diferencia de las tarjetas. Es deliberado: si
 * los llevara se leería como un cuarto plan, que es exactamente el problema que
 * esta versión resuelve.
 *
 * Sustituye a `VolumeEstimator`, que eran pastillas de radio. Siete tramos no
 * caben en una fila de píldoras sin partirse en dos, y partida deja de leerse
 * como una escala.
 */
export function PricingRail({
  value,
  onChange,
}: {
  value: VolumeId;
  onChange: (next: VolumeId) => void;
}) {
  return (
    <aside className="flex flex-col gap-6 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-10 xl:flex-col xl:items-stretch">
      <div className="lg:basis-full xl:basis-auto">
        <h3 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance">
          Empieza con 7 días gratis
        </h3>
        <p className="text-muted-foreground mt-3 flex items-start gap-2.5 text-[0.8125rem] leading-relaxed">
          <CreditCard aria-hidden className="text-brand mt-0.5 size-4 shrink-0" />
          No se necesita tarjeta de crédito. Aplica a Esencial, Crecimiento y Escala.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 lg:min-w-[17rem] lg:flex-1">
        <label
          htmlFor="pricing-volume"
          className="text-[0.8125rem] leading-snug font-medium"
        >
          ¿Cuántas conversaciones con IA manejas al mes?
        </label>
        <Select value={value} onValueChange={(next) => onChange(next as VolumeId)}>
          {/* `min-h-12` y no `h-12`: la variante de tamaño del trigger fija la
              altura con un selector `data-[size=...]`, que gana por
              especificidad a una clase de altura suelta. */}
          <SelectTrigger
            id="pricing-volume"
            className="hover:border-brand min-h-12 w-full rounded-xl text-base font-medium transition-colors"
          >
            {/* El contenido del ítem elegido se CLONA aquí, así que las clases
                del número (monoespaciada tabular) viajan solas al trigger. */}
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {PRICING_VOLUMES.map((volume) => (
              <SelectItem key={volume.id} value={volume.id} className="rounded-lg py-2.5">
                <span className="flex items-baseline gap-1.5">
                  <span className="font-mono font-medium tabular-nums">{volume.label}</span>
                  {volume.conversations === null ? null : (
                    <span className="text-muted-foreground text-xs">conversaciones</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <details className="border-border group border-t pt-4 lg:flex-1 lg:basis-full xl:basis-auto">
        <summary className="hover:text-brand marker:content-none cursor-pointer list-none text-[0.8125rem] font-medium underline decoration-dotted underline-offset-4">
          ¿Qué cuenta como una conversación con IA?
        </summary>
        <p className="text-muted-foreground mt-3 text-[0.8125rem] leading-relaxed">
          Un hilo con una misma persona atendido por tu agente durante el mes, sin importar cuántos
          mensajes se crucen. Si Ana escribe el día 3 y el día 20, son dos conversaciones; si escribe
          cuarenta veces el mismo día, es una. Lo que responde tu equipo a mano no consume cuota.
        </p>
      </details>

      <p className="bg-secondary text-muted-foreground rounded-xl p-3.5 text-[0.8125rem] leading-relaxed lg:flex-1 xl:flex-none">
        <b className="text-foreground font-semibold">No cobramos por usuario.</b> Suma a todo tu
        equipo al inbox sin que cambie el precio.
      </p>
    </aside>
  );
}
