"use client";

import { ArrowRightLeft, CalendarClock, FileText, HandCoins, Lock, Sparkles, TriangleAlert, type LucideIcon } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { StatusDotBadge } from "@/shared/components/ui/status-badges";
import { Switch } from "@/shared/components/ui/switch";
import type { FeatureDetailDTO } from "@/shared/auth/features.store";

/** Icono por función; una desconocida (catálogo nuevo en el backend) cae a genérico. */
const FEATURE_ICONS: Record<string, LucideIcon> = {
  payment_plans: CalendarClock,
  collections: HandCoins,
  fx_quotes: ArrowRightLeft,
  documents: FileText,
};

const NICHE_LABELS: Record<string, string> = {
  restaurants: "Restaurantes y comida",
  retail_fashion: "Retail y moda",
  hotels_tourism: "Hoteles y turismo",
  health_beauty: "Salud, belleza y citas",
  real_estate: "Inmobiliarias",
  education: "Educación y cursos",
  professional_services: "Servicios profesionales",
  b2b_distribution: "Distribuidores B2B",
  other: "Otro tipo de negocio",
};

/** Chip de origen: de dónde sale el valor de esta función. */
function OriginBadge({ feature, nicheCode }: { feature: FeatureDetailDTO; nicheCode: string | null }) {
  if (feature.source === "platform") {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <Lock aria-hidden="true" className="size-3" />
        Fijada por Axi
      </Badge>
    );
  }
  if (feature.source === "niche") {
    const niche = nicheCode === null ? null : (NICHE_LABELS[nicheCode] ?? null);
    return (
      <Badge variant="secondary" className="gap-1.5">
        <Sparkles aria-hidden="true" className="size-3 text-accent-violet" />
        {niche === null ? "Sugerida por tu tipo de negocio" : `Sugerida por ${niche}`}
      </Badge>
    );
  }
  if (feature.source === "tenant") {
    return <StatusDotBadge tone={feature.enabled ? "ok" : "off"}>{feature.enabled ? "Activada por ti" : "Apagada por ti"}</StatusDotBadge>;
  }
  return <StatusDotBadge tone="off">Apagada</StatusDotBadge>;
}

/**
 * Por qué no está activa aunque se haya decidido encenderla: el plan no
 * incluye la capacidad, o falta la función de la que depende. El backend lo
 * dice en `blocked_by`; aquí solo se traduce a algo accionable.
 */
function BlockedNote({ feature, labelOf }: { feature: FeatureDetailDTO; labelOf: (code: string) => string }) {
  if (feature.blocked_by === null) return null;
  const text =
    feature.blocked_by.kind === "capability"
      ? "Tu plan no incluye Ventas: la función queda apagada aunque la enciendas."
      : `Se activará cuando enciendas «${labelOf(feature.blocked_by.code)}».`;
  return (
    <span className="inline-flex items-center gap-1.5">
      <TriangleAlert aria-hidden="true" className="size-3.5 text-warning" />
      {text}
    </span>
  );
}

/**
 * Una función del catálogo: qué hace, de dónde sale su valor y el interruptor.
 * Fijada por Axi ⇒ deshabilitado (el backend responde 409); bloqueada por una
 * dependencia ⇒ se puede encender igual, y la fila explica qué falta.
 */
export function FeatureSwitchRow({
  feature,
  nicheCode,
  canManage,
  pending,
  labelOf,
  onToggle,
}: {
  feature: FeatureDetailDTO;
  nicheCode: string | null;
  canManage: boolean;
  pending: boolean;
  labelOf: (code: string) => string;
  onToggle: (enabled: boolean) => void;
}) {
  const Icon = FEATURE_ICONS[feature.code] ?? Sparkles;
  const locked = feature.locked;
  const capabilityMissing = feature.blocked_by?.kind === "capability";

  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-2 border-b border-border/60 py-4 last:border-b-0 sm:grid-cols-[40px_1fr_auto]">
      <div className="hidden size-10 place-items-center rounded-xl bg-secondary text-foreground sm:grid">
        <Icon aria-hidden="true" className={`size-[18px] ${feature.enabled ? "" : "text-muted-foreground"}`} />
      </div>
      <div className="min-w-0">
        <p className="font-medium">{feature.label}</p>
        <p className="mt-0.5 max-w-[64ch] text-sm text-muted-foreground">{feature.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-muted-foreground">
          <OriginBadge feature={feature} nicheCode={nicheCode} />
          <BlockedNote feature={feature} labelOf={labelOf} />
          {locked ? <span>Axi la fijó para este negocio. Escríbenos si la necesitas.</span> : null}
        </div>
      </div>
      <div className="flex items-center gap-2.5 pt-1 text-xs text-muted-foreground">
        {locked ? <Lock aria-hidden="true" className="size-3.5" /> : null}
        <span>{locked ? "Fijada" : feature.enabled ? "Encendida" : "Apagada"}</span>
        <Switch
          checked={feature.enabled}
          disabled={locked || pending || !canManage || capabilityMissing}
          aria-label={feature.label}
          onCheckedChange={onToggle}
        />
      </div>
    </div>
  );
}
