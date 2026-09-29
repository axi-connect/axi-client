"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { presetToSearchParams, type PresetAudience } from "@/modules/marketing/domain/campaign-draft";
import { stashPreset } from "@/modules/marketing/infrastructure/preset-handoff";

/**
 * «Enviar plantilla» (F6): el segundo verbo de toda barra de audiencia, al
 * lado de «Poner al agente a trabajar». Abre el asistente de campañas con la
 * audiencia ya decidida —una selección, un segmento o un import— para que el
 * operador elija la plantilla de Meta, la programe y vea el costo ahí, que es
 * donde esas tres cosas ya viven. No duplica nada del envío: una campaña ES
 * «una plantilla a muchos».
 *
 * Un segmento o un import van en la URL (un enlace que se puede copiar). Una
 * lista marcada NO cabe en una URL (C2: ~400 ids y Node corta la cabecera):
 * se deja en sessionStorage bajo una clave de un solo uso y viaja la clave.
 *
 * Los dos verbos se separan a propósito (decisión de producto 2026-09-28):
 * campaña = un mensaje a muchos, medible; seguimiento = un agente que conversa
 * con cada uno. Lo que comparten (audiencias, alcance por teléfono) vive en el
 * servidor.
 */
export function SendTemplateButton({
  audience,
  variant = "outline",
  size = "sm",
  className,
}: {
  audience: PresetAudience;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
  className?: string;
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  if (!hasPermission("marketing:manage")) return null;

  if (audience.mode === "contacts") {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => {
          const key = stashPreset(window.sessionStorage, audience);
          router.push(`/marketing/campaigns/new?preset=${encodeURIComponent(key)}`);
        }}
      >
        <Send aria-hidden className="size-4" />
        Enviar plantilla
      </Button>
    );
  }

  const href = `/marketing/campaigns/new?${presetToSearchParams(audience).toString()}`;
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link href={href}>
        <Send aria-hidden className="size-4" />
        Enviar plantilla
      </Link>
    </Button>
  );
}
