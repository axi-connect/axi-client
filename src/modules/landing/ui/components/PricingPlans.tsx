"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";

import { salesWhatsAppUrl } from "@/core/config/env";
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { TiltCard } from "@/shared/components/ui/tilt-card";
import { FoundersBar } from "@/modules/landing/ui/components/FoundersBar";
import { VolumeChips } from "@/modules/landing/ui/components/VolumeChips";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import {
  annualTotalCop,
  discountLabel,
  hasVolumeAxis,
  planListCop,
  planMonthlyCop,
  promotionOpen,
  volumeById,
  type PublicCatalog,
} from "@/modules/landing/domain/public-catalog";
import {
  ANNUAL_PAID_MONTHS,
  BILLING_PERIODS,
  MONTHS_PER_YEAR,
  formatCop,
  foundersDiscountBadge,
  planById,
  pricingPackages,
  type BillingPeriodId,
  type PricingPlan,
} from "@/modules/landing/ui/content/landing.content";

const SALES_PATH = "/contacto";

/**
 * §9 Paquetes. Isla de cliente con DOS estados —volumen y periodicidad— porque
 * el precio tiene dos ejes: el paquete cobra las funciones y el volumen cobra
 * las conversaciones.
 *
 * Las CIFRAS llegan del catálogo público por props (`catalog`), cargado en el
 * servidor con revalidación. Sin catálogo (API caído) la sección pinta
 * «precios a consulta» y manda a ventas: nunca una cifra de respaldo en el
 * código, que es como llegamos a tener tres precios distintos para lo mismo.
 *
 * Se pintan TRES tarjetas comparables, no cinco. La prueba gratuita se anuncia
 * en los propios botones y Enterprise baja a una franja: ninguna de las dos
 * reacciona al volumen. Los dos controles van ARRIBA y en una línea cada uno,
 * de modo que la fila de tarjetas se queda con el ancho entero.
 */
export function PricingPlans({ catalog }: { catalog: PublicCatalog | null }) {
  if (catalog === null) return <PricingUnavailable />;
  return <PricingGrid catalog={catalog} />;
}

function PricingGrid({ catalog }: { catalog: PublicCatalog }) {
  const twoAxis = hasVolumeAxis(catalog);
  const [volumeId, setVolumeId] = useState<string>(catalog.defaultVolumeId);
  const [period, setPeriod] = useState<BillingPeriodId>("monthly");

  // La FECHA de la promoción depende del reloj, y comprobarla en el primer
  // render la congelaría en la del despliegue —la página se prerenderiza—, así
  // que se verifica tras montar. Al vencer, la oferta cae sola a precios de
  // lista sin desplegar nada: fallo seguro. Los cupos ya vienen resueltos.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  const clock = now ?? new Date(catalog.asOf);
  const offerOpen = promotionOpen(catalog, clock);

  const packages = pricingPackages();
  const enterprise = planById("enterprise");

  return (
    <>
      {offerOpen && catalog.promotion ? (
        <Reveal className="mt-12">
          <FoundersBar promotion={catalog.promotion} />
        </Reveal>
      ) : null}

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

      {twoAxis ? (
        <Reveal className="mt-8">
          <VolumeChips volumes={catalog.volumes} value={volumeId} onChange={setVolumeId} />
        </Reveal>
      ) : null}

      <div className="mt-10 grid items-stretch gap-6 md:grid-cols-3">
        {packages.map((plan, i) => (
          <Reveal key={plan.id} delay={i * 0.08} className="h-full">
            <PlanCard
              plan={plan}
              catalog={catalog}
              volumeId={volumeId}
              period={period}
              offerOpen={offerOpen}
              clock={clock}
              twoAxis={twoAxis}
            />
          </Reveal>
        ))}
      </div>

      {enterprise ? (
        <Reveal className="mt-6">
          <EnterpriseBand plan={enterprise} floorCop={catalog.enterpriseFloorCop} />
        </Reveal>
      ) : null}
    </>
  );
}

/** Sin catálogo no hay cifra que dar: se ofrece la conversación, no un número inventado. */
function PricingUnavailable() {
  return (
    <Reveal className="mt-12">
      <div
        data-testid="pricing-unavailable"
        className="border-border bg-card rounded-2xl border p-8 text-center sm:p-10"
      >
        <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">Precios a consulta</p>
        <h3 className="font-heading mt-3 text-2xl font-bold tracking-tight text-balance">
          Estamos actualizando el catálogo. Te lo enviamos hoy mismo.
        </h3>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm leading-relaxed">
          Los precios se publican desde nuestro catálogo en vivo y ahora mismo no está disponible.
          Escríbenos y te mandamos el plan y el tramo que le queda a tu negocio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-11 px-6">
            <Link href={SALES_PATH}>Hablar con ventas</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 px-6">
            <a href={salesWhatsAppUrl("Hola, quiero conocer los planes de Axi Connect.")} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" className="size-4" />
              WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </Reveal>
  );
}

/** El enlace del CTA arrastra las dos elecciones: sin ellas, el alta empieza de cero. */
function signupHref(plan: PricingPlan, volumeId: string, period: BillingPeriodId, twoAxis: boolean): string {
  const [path, query = ""] = plan.cta.href.split("?");
  const params = new URLSearchParams(query);
  if (twoAxis) params.set("volumen", volumeId);
  params.set("periodo", period);
  return `${path}?${params.toString()}`;
}

function PlanCard({
  plan,
  catalog,
  volumeId,
  period,
  offerOpen,
  clock,
  twoAxis,
}: {
  plan: PricingPlan;
  catalog: PublicCatalog;
  volumeId: string;
  period: BillingPeriodId;
  offerOpen: boolean;
  clock: Date;
  twoAxis: boolean;
}) {
  const monthly = planMonthlyCop(catalog, plan.id, volumeId, clock);
  // Por encima del catálogo no hay cifra que dar: se pasa a ventas en vez de
  // publicar un precio que después habría que renegociar.
  const overCatalog = monthly === null;

  return (
    <TiltCard depth={6} className="h-full">
      <div
        data-testid={`plan-${plan.id}`}
        className={cn(
          "bg-card relative flex h-full flex-col gap-5 rounded-2xl border p-7",
          plan.featured ? "border-brand shadow-overlay md:-translate-y-3" : "border-border shadow-float",
        )}
      >
        {plan.badge ? (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge>{plan.badge}</Badge>
          </div>
        ) : null}

        <div>
          <h3 className="font-heading text-xl font-bold">{plan.name}</h3>
          <p className="text-muted-foreground mt-1.5 min-h-[3.2em] text-sm leading-relaxed">{plan.tagline}</p>
        </div>

        <PriceBlock
          plan={plan}
          catalog={catalog}
          volumeId={volumeId}
          period={period}
          offerOpen={offerOpen}
          clock={clock}
          twoAxis={twoAxis}
        />

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
          <Button asChild size="lg" variant={plan.featured ? "default" : "outline"} className="h-11 w-full">
            <Link href={overCatalog ? SALES_PATH : signupHref(plan, volumeId, period, twoAxis)}>
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
 * (`planMonthlyCop` sobre `planListCop`, ambos del catálogo): es imposible que
 * se contradigan.
 */
function PriceBlock({
  plan,
  catalog,
  volumeId,
  period,
  offerOpen,
  clock,
  twoAxis,
}: {
  plan: PricingPlan;
  catalog: PublicCatalog;
  volumeId: string;
  period: BillingPeriodId;
  offerOpen: boolean;
  clock: Date;
  twoAxis: boolean;
}) {
  const volume = volumeById(catalog, volumeId);
  const listCop = planListCop(catalog, plan.id, volumeId);
  const monthlyCop = planMonthlyCop(catalog, plan.id, volumeId, clock);

  if (listCop === null || monthlyCop === null) {
    return (
      <div className="flex min-h-[9rem] flex-col justify-center">
        <p className="font-heading text-2xl font-semibold tracking-tight">A la medida</p>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          Por encima del catálogo armamos el plan contigo.
        </p>
      </div>
    );
  }

  const listPrice = formatCop(listCop);
  const finalPrice = formatCop(monthlyCop);
  const annual = annualTotalCop(monthlyCop);
  const discounted = offerOpen && monthlyCop < listCop;
  const volumeText = twoAxis ? `${volume.label} conversaciones/mes.` : "";

  return (
    <div className="min-h-[9rem]">
      <span className="sr-only">
        {discounted
          ? `Antes ${listPrice} pesos, ahora ${finalPrice} pesos colombianos al mes con el descuento de fundador${twoAxis ? `, para ${volume.label} conversaciones al mes` : ""}.`
          : `${finalPrice} pesos colombianos al mes${twoAxis ? `, para ${volume.label} conversaciones al mes` : ""}.`}
      </span>

      <div aria-hidden>
        <p className="text-muted-foreground h-5 text-sm">{discounted ? <s className="text-base">{listPrice}</s> : null}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">{finalPrice}</span>
          <span className="text-muted-foreground text-sm">{plan.priceUnit}</span>
        </p>
        {discounted && catalog.promotion ? (
          <Badge variant="warning" className="mt-2.5">
            {foundersDiscountBadge(discountLabel(catalog.promotion))}
          </Badge>
        ) : null}

        {/* El beneficio del anual NO es una tarifa menor: son doce meses de
            servicio y once facturados. Por eso la cifra grande no cambia al
            conmutar —así las tres tarjetas siguen comparándose entre sí— y lo
            que aparece es el total del año con el ahorro puesto en pesos. */}
        <p className="text-muted-foreground mt-2.5 text-xs leading-relaxed">
          {period === "annual" ? (
            <>
              {MONTHS_PER_YEAR} meses por <b className="text-foreground font-medium tabular-nums">{formatCop(annual)}</b>{" "}
              <s>{formatCop(monthlyCop * MONTHS_PER_YEAR)}</s>
              <br />
              Te ahorras <b className="text-foreground font-medium tabular-nums">{finalPrice}</b>:{" "}
              {MONTHS_PER_YEAR - ANNUAL_PAID_MONTHS} mes gratis.
            </>
          ) : (
            <>{volumeText} Facturado cada mes, cancelas cuando quieras.</>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * Enterprise: franja, no tarjeta. No comparte fila porque no comparte eje —ni
 * reacciona al volumen ni tiene prueba gratuita—, y metida en la rejilla solo
 * robaba ancho a las tres que se comparan. El piso publicado viene del catálogo.
 */
function EnterpriseBand({ plan, floorCop }: { plan: PricingPlan; floorCop: number | null }) {
  return (
    <div
      data-testid={`plan-${plan.id}`}
      className="border-border bg-secondary grid items-center gap-7 rounded-2xl border p-7 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.3fr)_auto] lg:gap-x-11"
    >
      <div>
        <h3 className="font-heading text-xl font-bold">{plan.name}</h3>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
            {floorCop === null ? "A la medida" : `Desde ${formatCop(floorCop)}`}
          </span>
          {floorCop === null ? null : <span className="text-muted-foreground text-sm">{plan.priceUnit}</span>}
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
        <p className="text-muted-foreground text-center text-xs leading-relaxed">{plan.ctaMicrocopy}</p>
      </div>
    </div>
  );
}
