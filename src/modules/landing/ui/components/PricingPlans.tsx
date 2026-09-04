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
import { PricingRail } from "@/modules/landing/ui/components/PricingRail";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import {
  ANNUAL_PAID_MONTHS,
  BILLING_PERIODS,
  DEFAULT_VOLUME_ID,
  FOUNDERS,
  MONTHS_PER_YEAR,
  annualTotalCop,
  formatCop,
  foundersOfferOpen,
  foundersRemaining,
  planById,
  planListCop,
  planMonthlyCop,
  pricingPackages,
  volumeById,
  type BillingPeriodId,
  type PricingPlan,
  type VolumeId,
} from "@/modules/landing/ui/content/landing.content";

const SALES_PATH = "/contacto";

/**
 * §9 Paquetes. Isla de cliente con DOS estados —volumen y periodicidad— porque
 * el precio tiene dos ejes: el paquete cobra las funciones y el volumen cobra
 * las conversaciones (`landing.content.ts`).
 *
 * Se pintan TRES tarjetas comparables, no cinco. La prueba gratuita se mudó al
 * rail y Enterprise a una franja propia: ninguna de las dos reacciona al
 * volumen, así que ocupando fila solo estrujaban a las tres que sí se comparan
 * entre sí.
 *
 * La cabecera, el microcopy y `FoundersBar` no se tocan desde aquí.
 */
export function PricingPlans() {
  const [volumeId, setVolumeId] = useState<VolumeId>(DEFAULT_VOLUME_ID);
  const [period, setPeriod] = useState<BillingPeriodId>("monthly");

  // Los cupos son una constante del content: se conocen en SSR y no hay riesgo
  // de hidratación. La FECHA sí depende del reloj, y comprobarla en el primer
  // render la congelaría en la del despliegue —la página se prerenderiza—, así
  // que se verifica tras montar. Al vencer, la oferta cae sola a precios de
  // lista sin desplegar nada: fallo seguro.
  const [deadlineOpen, setDeadlineOpen] = useState(true);
  const offerOpen = foundersRemaining() > 0 && deadlineOpen;

  useEffect(() => {
    setDeadlineOpen(foundersOfferOpen(new Date()));
  }, []);

  const packages = pricingPackages();
  const enterprise = planById("enterprise");

  return (
    <>
      <Reveal className="mt-12">
        <FoundersBar />
      </Reveal>

      <Reveal className="mt-10 flex justify-center">
        <SegmentedControl<BillingPeriodId>
          label="Periodicidad de pago"
          value={period}
          onValueChange={setPeriod}
          items={BILLING_PERIODS.map((option) => ({
            value: option.id,
            label: option.label,
            count: option.badge,
          }))}
        />
      </Reveal>

      {/* El rail se despliega en horizontal ANTES de que las tarjetas se
          estrechen: comprimir las tres es justo lo que hacía ilegible la
          versión de cinco columnas. Lo que cede es el marco, nunca lo que se
          compara. */}
      <div className="mt-11 grid items-stretch gap-6 lg:grid-cols-3 xl:grid-cols-[19rem_repeat(3,minmax(0,1fr))]">
        <div className="lg:col-span-3 xl:col-span-1">
          <PricingRail value={volumeId} onChange={setVolumeId} />
        </div>

        {packages.map((plan, i) => (
          <Reveal key={plan.id} delay={i * 0.08} className="h-full">
            <PlanCard plan={plan} volumeId={volumeId} period={period} offerOpen={offerOpen} />
          </Reveal>
        ))}
      </div>

      {enterprise ? (
        <Reveal className="mt-6">
          <EnterpriseBand plan={enterprise} />
        </Reveal>
      ) : null}
    </>
  );
}

/** El enlace del CTA arrastra las dos elecciones: sin ellas, el alta empieza de cero. */
function signupHref(plan: PricingPlan, volumeId: VolumeId, period: BillingPeriodId): string {
  const [path, query = ""] = plan.cta.href.split("?");
  const params = new URLSearchParams(query);
  params.set("volumen", volumeId);
  params.set("periodo", period);
  return `${path}?${params.toString()}`;
}

function PlanCard({
  plan,
  volumeId,
  period,
  offerOpen,
}: {
  plan: PricingPlan;
  volumeId: VolumeId;
  period: BillingPeriodId;
  offerOpen: boolean;
}) {
  const monthly = planMonthlyCop(plan, volumeId);
  // Por encima del catálogo no hay cifra que dar: se pasa a ventas en vez de
  // publicar un precio que después habría que renegociar.
  const overCatalog = monthly === null;

  return (
    <TiltCard depth={6} className="h-full">
      <div
        data-testid={`plan-${plan.id}`}
        className={cn(
          "bg-card relative flex h-full flex-col gap-5 rounded-2xl border p-7",
          plan.featured
            ? "border-brand shadow-overlay xl:-translate-y-3"
            : "border-border shadow-float",
        )}
      >
        {plan.badge ? (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge>{plan.badge}</Badge>
          </div>
        ) : null}

        <div>
          <h3 className="font-heading text-xl font-bold">{plan.name}</h3>
          <p className="text-muted-foreground mt-1.5 min-h-[3.2em] text-sm leading-relaxed">
            {plan.tagline}
          </p>
        </div>

        <PriceBlock plan={plan} volumeId={volumeId} period={period} offerOpen={offerOpen} />

        <p className="border-border text-muted-foreground border-t pt-4 text-xs font-semibold tracking-wider uppercase">
          {plan.inheritsFrom ? `Todo lo de ${plan.inheritsFrom}, y además` : "Incluye"}
        </p>

        <ul className="flex flex-1 flex-col gap-3">
          {plan.bullets.map((bullet) => (
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
            <Link href={overCatalog ? SALES_PATH : signupHref(plan, volumeId, period)}>
              {overCatalog ? "Hablar con ventas" : plan.cta.label}
            </Link>
          </Button>
          <p className="text-muted-foreground min-h-[2.1em] text-center text-xs leading-relaxed">
            {overCatalog ? "Te respondemos el mismo día." : plan.ctaMicrocopy}
          </p>
        </div>
      </div>
    </TiltCard>
  );
}

/**
 * Bloque de precio. El tachado y el precio final salen del MISMO número
 * (`planMonthlyCop` sobre `planListCop`): es imposible que se contradigan al
 * editar el descuento o una tarifa.
 */
function PriceBlock({
  plan,
  volumeId,
  period,
  offerOpen,
}: {
  plan: PricingPlan;
  volumeId: VolumeId;
  period: BillingPeriodId;
  offerOpen: boolean;
}) {
  const volume = volumeById(volumeId);
  const listCop = planListCop(plan, volumeId);
  const monthlyCop = planMonthlyCop(plan, volumeId);

  if (listCop === null || monthlyCop === null) {
    return (
      <div className="flex min-h-[9rem] flex-col justify-center">
        <p className="font-heading text-2xl font-semibold tracking-tight">A la medida</p>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          Por encima de 25.000 conversaciones armamos el plan contigo.
        </p>
      </div>
    );
  }

  const listPrice = formatCop(listCop);
  const finalPrice = formatCop(monthlyCop);
  const annual = annualTotalCop(monthlyCop);

  return (
    <div className="min-h-[9rem]">
      <span className="sr-only">
        {offerOpen
          ? `Antes ${listPrice} pesos, ahora ${finalPrice} pesos colombianos al mes con el descuento de fundador, para ${volume.label} conversaciones al mes.`
          : `${finalPrice} pesos colombianos al mes, para ${volume.label} conversaciones al mes.`}
      </span>

      <div aria-hidden>
        <p className="text-muted-foreground h-5 text-sm">
          {offerOpen ? <s className="text-base">{listPrice}</s> : null}
        </p>
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

        {/* El beneficio del anual NO es una tarifa menor: son doce meses de
            servicio y once facturados. Por eso la cifra grande no cambia al
            conmutar —así las tres tarjetas siguen comparándose entre sí— y lo
            que aparece es el total del año con el ahorro puesto en pesos. */}
        <p className="text-muted-foreground mt-2.5 text-xs leading-relaxed">
          {period === "annual" ? (
            <>
              {MONTHS_PER_YEAR} meses por{" "}
              <b className="text-foreground font-medium tabular-nums">{formatCop(annual)}</b>{" "}
              <s>{formatCop(monthlyCop * MONTHS_PER_YEAR)}</s>
              <br />
              Te ahorras{" "}
              <b className="text-foreground font-medium tabular-nums">{finalPrice}</b>:{" "}
              {MONTHS_PER_YEAR - ANNUAL_PAID_MONTHS} mes gratis.
            </>
          ) : (
            <>
              {volume.label} conversaciones/mes. Facturado cada mes, cancelas cuando quieras.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * Enterprise: franja, no tarjeta. No comparte fila porque no comparte eje —ni
 * reacciona al volumen ni tiene prueba gratuita—, y metida en la rejilla solo
 * robaba ancho a las tres que se comparan.
 */
function EnterpriseBand({ plan }: { plan: PricingPlan }) {
  return (
    <div
      data-testid={`plan-${plan.id}`}
      className="border-border bg-secondary grid items-center gap-7 rounded-2xl border p-7 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.3fr)_auto] lg:gap-x-11"
    >
      <div>
        <h3 className="font-heading text-xl font-bold">{plan.name}</h3>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
            {plan.priceValue}
          </span>
          <span className="text-muted-foreground text-sm">{plan.priceUnit}</span>
        </p>
        <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed">
          {plan.tagline} Todo lo de {plan.inheritsFrom}, y además:
        </p>
      </div>

      <ul className="grid gap-x-7 gap-y-3 sm:grid-cols-2">
        {plan.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2.5 text-sm leading-relaxed">
            <Check aria-hidden className="text-brand mt-0.5 size-4 shrink-0" />
            {bullet}
          </li>
        ))}
      </ul>

      <div className="flex min-w-[13rem] flex-col gap-2">
        <Button asChild size="lg" variant="outline" className="h-11 w-full">
          <Link href={plan.cta.href}>{plan.cta.label}</Link>
        </Button>
        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          {plan.ctaMicrocopy}
        </p>
      </div>
    </div>
  );
}
