"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { presetToSearchParams, type PresetAudience } from "@/modules/marketing/domain/campaign-draft";

/**
 * «Enviar plantilla» (F6): el segundo verbo de toda barra de audiencia, al
 * lado de «Poner al agente a trabajar». Abre el asistente de campañas con la
 * audiencia ya decidida —una selección, un segmento o un import— para que el
 * operador elija la plantilla de Meta, la programe y vea el costo ahí, que es
 * donde esas tres cosas ya viven. No duplica nada del envío: una campaña ES
 * «una plantilla a muchos».
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
  if (!hasPermission("marketing:manage")) return null;
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
