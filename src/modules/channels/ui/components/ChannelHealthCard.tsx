"use client";

import { Clock, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import {
  readConnectionMethod,
  readLastCheck,
  readMessagingLimit,
  readMetaAccess,
  readOnboardingNotice,
  readQualityRating,
  type HealthReading,
  type HealthTone,
} from "@/modules/channels/domain/channel-health";

/**
 * Tarjeta de salud del canal — **una sola implementación** para la página de
 * detalle y el sheet del workspace.
 *
 * El bloque de datos vivía escrito a mano en `ChannelDetailSheet`, así que cada
 * campo nuevo había que añadirlo en dos sitios y el primero en olvidarse mostraba
 * menos información sin que nadie se enterara. Si en una revisión las dos
 * superficies se ven distintas, la duplicación volvió.
 *
 * `compact` es para el sheet, donde no hay ancho para tres columnas.
 *
 * Dos reglas que gobiernan el contenido:
 *
 * - **Ningún enum de Meta llega a la pantalla.** Las traducciones son funciones
 *   puras en `domain/channel-health.ts`, con su propio test.
 * - **Ningún número se inventa.** El bloque de la ventana de 24 h es texto
 *   explicativo fijo, no una métrica: el backend no expone un agregado de
 *   ventanas abiertas, y rellenar ese hueco con un número plausible sería el peor
 *   error posible en una pantalla de salud.
 */
export function ChannelHealthCard({
  channel,
  compact = false,
  className,
}: {
  channel: ChannelDTO;
  compact?: boolean;
  className?: string;
}) {
  const isCloud = channel.kind === "whatsapp_cloud";
  /**
   * Instagram y Messenger **no tienen teléfono**, y su adaptador reutiliza
   * `display_phone_number` para guardar el usuario público de la cuenta. Etiquetar
   * ese campo como «Teléfono» mostraba «Sin datos» en un dato que nunca va a
   * existir, y escondía el que sí está. La etiqueta la decide el kind.
   */
  const hasPhone = isCloud || channel.kind === "whatsapp_web";
  const accountLabel = hasPhone ? "Teléfono" : "Cuenta";
  const quality = readQualityRating(channel.quality_rating);
  const limit = readMessagingLimit(channel.messaging_limit);
  const access = readMetaAccess(channel);
  const notice = readOnboardingNotice(channel.onboarding?.status);

  return (
    <div className={cn("space-y-4", className)}>
      {notice !== null && (
        <div
          role="status"
          className={cn(
            "flex gap-3 rounded-md border p-3.5",
            notice.tone === "warning"
              ? "border-warning/40 bg-warning/[0.09]"
              : "border-info/40 bg-info/[0.08]",
          )}
        >
          {notice.tone === "warning" ? (
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
          ) : (
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
          )}
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold">{notice.title}</p>
            <p className="text-sm text-muted-foreground">{notice.detail}</p>
          </div>
        </div>
      )}

      <dl
        className={cn(
          "grid gap-4",
          compact
            ? "[grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))]"
            : "gap-5 [grid-template-columns:repeat(auto-fit,minmax(13.75rem,1fr))]",
        )}
      >
        <Reading
          label={accountLabel}
          reading={{
            label:
              channel.display_phone_number === null || channel.display_phone_number === ""
                ? "Sin datos"
                : channel.display_phone_number,
            tone: "neutral",
          }}
          plain
        />
        <Reading
          label="Nombre verificado"
          reading={{ label: channel.verified_name ?? "Sin datos", tone: "neutral" }}
          plain
        />
        {isCloud && <Reading label="Calidad del número" reading={quality} />}
        {isCloud && <Reading label="Puedes iniciar" reading={limit} />}
        <Reading label="Acceso de Meta" reading={access} />
        <Reading
          label="Última comprobación"
          reading={{ label: readLastCheck(channel.last_health_check_at), tone: "neutral" }}
          plain
        />
        <Reading
          label="Forma de conexión"
          reading={{ label: readConnectionMethod(channel.connection_method), tone: "neutral" }}
          plain
        />
      </dl>

      {isCloud && (
        <div className="flex gap-3 rounded-md border border-border bg-muted/40 p-3.5">
          <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">La ventana de 24 horas</p>
            <p className="text-sm text-muted-foreground">
              Cuando alguien te escribe puedes responderle libremente durante 24 horas. Pasado ese
              tiempo, para retomar la conversación hay que usar una plantilla aprobada por Meta, y
              esos mensajes sí tienen costo.
            </p>
            {/* Se cuenta por conversación y el backend no expone un agregado: por
                eso esto es una explicación y NO una métrica. Cualquier número
                aquí que no venga de un campo del DTO es un dato inventado. */}
            <p className="text-xs text-muted-foreground">
              Se cuenta por conversación, no por canal: cada cliente tiene su propia ventana.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const TONE_TEXT: Record<HealthTone, string> = {
  good: "text-success",
  warning: "text-warning",
  // `destructive` y nunca el coral de marca: son dos rojos distintos y
  // confundirlos hace que un fallo parezca un acento de marca
  bad: "text-destructive",
  neutral: "text-foreground",
};

function Reading({
  label,
  reading,
  plain = false,
}: {
  label: string;
  reading: HealthReading;
  plain?: boolean;
}) {
  const value = (
    <dd className={cn("flex items-center gap-1.5 text-sm font-medium", TONE_TEXT[reading.tone])}>
      {!plain && reading.tone !== "neutral" && (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            reading.tone === "good" && "bg-success",
            reading.tone === "warning" && "bg-warning",
            reading.tone === "bad" && "bg-destructive",
          )}
        />
      )}
      {reading.label}
    </dd>
  );

  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      {reading.hint === undefined ? (
        value
      ) : (
        // El tooltip lleva la explicación que hace accionable el indicador: sin
        // ella, el tenant ve un punto rojo y no tiene ninguna acción posible
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-4">
              {value}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-72">
            {reading.hint}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
