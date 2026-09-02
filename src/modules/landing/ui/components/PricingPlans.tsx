"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { TiltCard } from "@/shared/components/ui/tilt-card";
import { FoundersBar } from "@/modules/landing/ui/components/FoundersBar";
import { VolumeEstimator } from "@/modules/landing/ui/components/VolumeEstimator";
import {
  FOUNDERS,
  PRICING,
  SBS_TIERS,
  VOLUME_ESTIMATOR,
  daysUntil,
  formatCop,
  founderCop,
  foundersRemaining,
  sbsTier,
  type PricingPlan,
  type SbsTierId,
  type VolumeChoiceId,
} from "@/modules/landing/ui/content/landing.content";

const DEFAULT_CHOICE: VolumeChoiceId = "unknown";
const DEFAULT_TIER: SbsTierId = SBS_TIERS[0].id;

/**
 * Tarjetas de planes + estimador de volumen (§9).
 *
 * Isla de cliente: el estimador es el único estado de la sección y decide dos
 * cosas — qué tramo de precio muestra SBS y qué tarjeta lleva el sello «Tu
 * plan». La cabecera y el microcopy siguen siendo RSC en `LandingPricing`.
 */
export function PricingPlans() {
  const [choiceId, setChoiceId] = useState<VolumeChoiceId>(DEFAULT_CHOICE);
  // Los cupos son una constante del content: se conoce en SSR y no hay riesgo
  // de hidratación. La fecha sí depende del reloj → se verifica tras montar,
  // y al vencer la oferta cae sola a precios de lista (fallo seguro).
  const [deadlineOpen, setDeadlineOpen] = useState(true);
  const offerOpen = foundersRemaining() > 0 && deadlineOpen;

  useEffect(() => {
    setDeadlineOpen(daysUntil(FOUNDERS.deadline, new Date()) > 0);
  }, []);

  const choice = VOLUME_ESTIMATOR.choices.find((c) => c.id === choiceId) ?? VOLUME_ESTIMATOR.choices[3];
  const tier = sbsTier(choice.tier ?? DEFAULT_TIER);

  return (
    <>
      <Reveal className="mt-12">
        <FoundersBar />
      </Reveal>

      <Reveal className="mt-12">
        <VolumeEstimator value={choiceId} onChange={setChoiceId} />
      </Reveal>

      <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-3">
        {PRICING.plans.map((plan, i) => (
          <Reveal key={plan.id} delay={i * 0.08} className="h-full">
            <PlanCard
              plan={plan}
              recommended={choice.recommends === plan.id}
              offerOpen={offerOpen}
              tierListCop={tier.listCop}
              tierVolumeBullet={tier.volumeBullet}
              /** Sin tramo elegido el precio se presenta como "Desde". */
              showFrom={choice.tier === null}
            />
          </Reveal>
        ))}
      </div>

    </>
  );
}

function PlanCard({
  plan,
  recommended,
  offerOpen,
  tierListCop,
  tierVolumeBullet,
  showFrom,
}: {
  plan: PricingPlan;
  recommended: boolean;
  offerOpen: boolean;
  tierListCop: number;
  tierVolumeBullet: string;
  showFrom: boolean;
}) {
  // El bullet de volumen no vive en el plan: lo aporta el tramo activo y
  // encabeza la lista, para que el precio y el volumen se lean juntos.
  const bullets = plan.priceKind === "tiered" ? [tierVolumeBullet, ...plan.bullets] : plan.bullets;

  return (
    <TiltCard depth={6} className="h-full">
      <div
        data-testid={`plan-${plan.id}`}
        className={cn(
          "bg-card relative flex h-full flex-col gap-5 rounded-2xl border p-8",
          plan.featured ? "border-brand shadow-overlay lg:-translate-y-3" : "border-border shadow-float",
          recommended && "ring-brand ring-offset-background ring-2 ring-offset-2",
        )}
      >
        {plan.badge || recommended ? (
          <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 gap-2">
            {plan.badge ? <Badge>{plan.badge}</Badge> : null}
            {recommended ? (
              <Badge variant="warning">{VOLUME_ESTIMATOR.recommendedBadge}</Badge>
            ) : null}
          </div>
        ) : null}

        <div>
          <h3 className="font-heading text-xl font-bold">{plan.name}</h3>
          {plan.abbr ? (
            <p className="text-muted-foreground mt-0.5 font-mono text-xs tracking-widest">
              {plan.abbr}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{plan.tagline}</p>
        </div>

        <PriceBlock
          plan={plan}
          offerOpen={offerOpen}
          tierListCop={tierListCop}
          showFrom={showFrom}
        />

        <ul className="flex flex-1 flex-col gap-3">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <Check aria-hidden className="text-brand mt-0.5 size-4 shrink-0" />
              {bullet}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <Button
            asChild
            size="lg"
            variant={plan.featured ? "default" : "outline"}
            className="h-11 w-full"
          >
            {/* El destino lo declara el content: los paquetes autoservicio abren
                el registro con la oferta preseleccionada; Enterprise va a ventas. */}
            <Link href={plan.cta.href}>{plan.cta.label}</Link>
          </Button>
          {plan.ctaMicrocopy ? (
            <p className="text-muted-foreground text-center text-xs leading-relaxed">
              {plan.ctaMicrocopy}
            </p>
          ) : null}
        </div>
      </div>
    </TiltCard>
  );
}

/**
 * Bloque de precio. En el plan por tramos, el precio de lista y el de fundador
 * salen del MISMO número (`founderCop`): es imposible que el tachado y el
 * precio final se contradigan al editar el descuento.
 */
function PriceBlock({
  plan,
  offerOpen,
  tierListCop,
  showFrom,
}: {
  plan: PricingPlan;
  offerOpen: boolean;
  tierListCop: number;
  showFrom: boolean;
}) {
  if (plan.priceKind !== "tiered") {
    // La monoespaciada es para cifras (DESIGN §4): "7 días" sí, "Precio a la
    // medida" no — ahí el peso tipográfico hace el trabajo.
    const isFigure = plan.priceKind === "free";
    return (
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span
          className={cn(
            "text-3xl font-semibold tracking-tight",
            isFigure ? "font-mono tabular-nums" : "font-heading",
          )}
        >
          {plan.priceValue}
        </span>
        {plan.priceUnit ? (
          <span className="text-muted-foreground text-sm">{plan.priceUnit}</span>
        ) : null}
      </p>
    );
  }

  const listPrice = formatCop(tierListCop);
  const finalPrice = offerOpen ? formatCop(founderCop(tierListCop)) : listPrice;

  return (
    <div>
      <span className="sr-only">
        {offerOpen
          ? `Antes ${listPrice} pesos, ahora ${finalPrice} pesos colombianos al mes con el descuento de fundador.`
          : `${finalPrice} pesos colombianos al mes.`}
      </span>
      <div aria-hidden>
        {showFrom || offerOpen ? (
          <p className="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-sm">
            {showFrom ? <span>Desde</span> : null}
            {offerOpen ? <s className="text-base">{listPrice}</s> : null}
          </p>
        ) : null}
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
            {finalPrice}
          </span>
          <span className="text-muted-foreground text-sm">{plan.priceUnit}</span>
        </p>
        {offerOpen ? (
          <Badge variant="warning" className="mt-2.5">
            {FOUNDERS.discountBadge}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
