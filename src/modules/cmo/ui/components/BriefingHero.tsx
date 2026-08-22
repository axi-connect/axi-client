"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { BriefingDTO } from "@/modules/cmo/domain/cmo";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AxelOrb } from "./AxelOrb";

interface BriefingHeroProps {
  briefing: BriefingDTO | null;
  loading: boolean;
  /** Hora local a la que corre el briefing, de los ajustes del tenant. */
  briefingHour: number;
  ownerName: string | null;
  /** Propuestas pendientes: es lo que el hero promete que hay más abajo. */
  proposalCount: number;
  /** true mientras Axel piensa: el orbe respira. */
  busy: boolean;
}

/**
 * El hero del despacho: el orbe con el personaje y, debajo, **el briefing
 * destilado**.
 *
 * Antes esto era una tarjeta con borde y franja tricolor metida en una banda
 * propia encima del chat. Se quitó porque esa banda no declaraba fondo, heredaba
 * el degradado `muted` de la superficie del panel y chocaba con el fondo opaco
 * de `.axel-field` un píxel más abajo: una costura horizontal que partía la
 * pantalla en dos. Ahora el hero vive DENTRO del campo, en la misma columna de
 * 640 que el hilo y el composer, y el detalle del briefing (los `highlights`)
 * baja al rail, en «La lectura de Axel».
 *
 * **El titular es el `summary` tal cual.** El contrato solo trae esa frase, sin
 * título ni cifra en campo aparte, así que no se descompone ni se resalta nada
 * por dentro: lo que llega del backend se pinta, y punto.
 *
 * El caso que decide el resto del diseño NO es el feliz: es el del tenant que
 * acaba de encender a Axel y todavía no ha tenido su primer análisis. Ese estado
 * es **normal**, no un error, así que dice qué va a pasar y cuándo en una línea
 * discreta — no en una tarjeta que compita con el chat.
 */
export function BriefingHero({
  briefing,
  loading,
  briefingHour,
  ownerName,
  proposalCount,
  busy,
}: BriefingHeroProps) {
  const today = useTodayLabel();

  return (
    <div className="flex flex-col items-center text-center">
      <AxelOrb busy={busy} />

      <p className="mt-5 text-[13px] text-muted-foreground">
        {ownerName === null ? "Buen día" : `Buen día, ${ownerName}`}
        {today === null ? null : ` · ${today}`}
      </p>

      {loading && briefing === null ? (
        <div className="mt-4 flex w-full max-w-[26ch] flex-col items-center gap-3">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-4/5" />
        </div>
      ) : briefing === null ? (
        <>
          <h1 className="font-heading mt-1.5 max-w-[18ch] text-[34px] leading-[1.18] font-extralight tracking-tight text-foreground/30">
            Soy Axel, tu <b className="font-bold text-foreground">director de mercadeo</b>
          </h1>
          <p className="mt-3.5 max-w-[46ch] text-[13px] text-muted-foreground">
            Miro tus números todos los días y te dejo propuestas listas para decidir.
            Nada se envía a un cliente sin que tú lo apruebes.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground/80">
            <Clock className="size-3.5 text-accent-violet" aria-hidden="true" />
            <span>
              Mi primer informe llega mañana a las{" "}
              <b className="font-semibold text-muted-foreground">{formatHour(briefingHour)}</b>. Si
              no quieres esperar, pregúntame ahora.
            </span>
          </p>
        </>
      ) : (
        <>
          <h1
            className={cn(
              "font-heading mt-1.5 max-w-[26ch] text-[32px] leading-[1.2] font-extralight",
              "tracking-tight text-balance tabular-nums",
              loading && "opacity-60 transition-opacity",
            )}
          >
            {briefing.summary}
          </h1>
          <p className="mt-3.5 max-w-[46ch] text-[13px] text-muted-foreground">
            {proposalCount > 0
              ? `Te dejé ${String(proposalCount)} ${proposalCount === 1 ? "propuesta" : "propuestas"} listas para decidir. Están abajo y en el tablero.`
              : "Hoy no encontré nada que valga la pena proponerte. Si quieres que mire algo en concreto, dímelo."}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * El día de hoy, en es-CO. Se calcula DESPUÉS de montar y no en el render: el
 * servidor y el navegador pueden estar en husos distintos, y una fecha formateada
 * en el HTML del servidor que no coincide con la del cliente es un error de
 * hidratación. Hasta que llega, el saludo se pinta sin fecha — no hay salto de
 * layout porque va en la misma línea.
 */
function useTodayLabel(): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(
      new Intl.DateTimeFormat("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    );
  }, []);

  return label;
}

function formatHour(hour: number): string {
  const suffix = hour < 12 ? "a.m." : "p.m.";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(twelve)}:00 ${suffix}`;
}
