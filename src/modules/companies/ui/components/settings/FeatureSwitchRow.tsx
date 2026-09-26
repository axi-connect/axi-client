"use client";

import { ArrowRightLeft, CalendarClock, FileText, HandCoins, Lock, Sparkles, TriangleAlert, type LucideIcon } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { StatusDotBadge } from "@/shared/components/ui/status-badges";
import { Switch } from "@/shared/components/ui/switch";
import { BentoLink, StatePill } from "@/shared/components/features/bento";
import type { FeatureDetailDTO } from "@/shared/auth/features.store";
import type { FeatureSetup } from "@/modules/companies/domain/cobros-setup";

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
      <span className="inline-flex items-center gap-1.5">
        <Sparkles aria-hidden="true" className="size-3.5 text-accent-violet" />
        {niche === null ? "Sugerida por tu tipo de negocio" : `Sugerida por ${niche}`}
      </span>
    );
  }
  if (feature.source === "tenant") {
    return <StatusDotBadge tone={feature.enabled ? "ok" : "off"}>{feature.enabled ? "Activada por ti" : "Apagada por ti"}</StatusDotBadge>;
  }
  // `default`: nadie la decidió — ni Axi, ni un tipo de negocio, ni tú. El
  // interruptor ya dice «Encendida/Apagada»; el chip dice DE DÓNDE sale, que
  // es lo que faltaba sin tipo de negocio (QA real F1: dos «Apagada» seguidos).
  return (
    <StatusDotBadge tone="off">
      {feature.enabled ? "Encendida de fábrica" : "Apagada de fábrica"}
    </StatusDotBadge>
  );
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
    <span className="inline-flex items-start gap-1.5">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
      {text}
    </span>
  );
}

/** El estado en una palabra, con el color en el punto (§9.5). */
function statePill(feature: FeatureDetailDTO): { tone: "success" | "warning" | "neutral"; text: string } {
  if (feature.enabled && feature.blocked_by !== null) return { tone: "warning", text: "En espera" };
  if (feature.enabled) return { tone: "success", text: "Encendida" };
  return { tone: "neutral", text: "Apagada" };
}

/**
 * Una función del catálogo como ficha del bento (Cobros premium P1): qué
 * hace, en qué estado está, de dónde sale su valor y —encendida— dónde se
 * configura y cómo quedó. Fijada por Axi ⇒ deshabilitado (el backend responde
 * 409); bloqueada por una dependencia ⇒ se puede encender igual, y la ficha
 * explica qué falta.
 */
export function FeatureSwitchRow({
  feature,
  nicheCode,
  canManage,
  pending,
  labelOf,
  onToggle,
  setup,
}: {
  feature: FeatureDetailDTO;
  nicheCode: string | null;
  canManage: boolean;
  pending: boolean;
  labelOf: (code: string) => string;
  onToggle: (enabled: boolean) => void;
  /** Cómo quedó configurada; `undefined` mientras se lee o si no aplica. */
  setup?: FeatureSetup;
}) {
  const Icon = FEATURE_ICONS[feature.code] ?? Sparkles;
  const locked = feature.locked;
  const capabilityMissing = feature.blocked_by?.kind === "capability";
  const effective = feature.enabled && feature.blocked_by === null;
  const pill = statePill(feature);

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl",
            effective ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="truncate text-base font-semibold" title={feature.label}>
            {feature.label}
          </h3>
          <StatePill tone={pill.tone}>
            {locked ? <Lock aria-hidden="true" className="size-3" /> : null}
            {pill.text}
          </StatePill>
        </div>
        <Switch
          checked={feature.enabled}
          disabled={locked || pending || !canManage || capabilityMissing}
          aria-label={feature.label}
          onCheckedChange={onToggle}
          className="mt-1"
        />
      </div>
      <p className="text-sm leading-relaxed text-pretty text-foreground/80">{feature.description}</p>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-muted-foreground">
        <OriginBadge feature={feature} nicheCode={nicheCode} />
        <BlockedNote feature={feature} labelOf={labelOf} />
        {locked ? <span>Axi la fijó para este negocio. Escríbenos si la necesitas.</span> : null}
      </div>
      {effective && setup !== undefined ? (
        <div className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/60 pt-3">
          <span
            className={cn("min-w-0 truncate text-[13px]", setup.configured === true ? "text-foreground/80" : "text-muted-foreground")}
            title={setup.foot}
          >
            {setup.foot}
          </span>
          <BentoLink href={setup.href} className="text-[13px]">
            {setup.linkLabel}
          </BentoLink>
        </div>
      ) : null}
    </article>
  );
}
