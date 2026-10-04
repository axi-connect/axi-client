"use client";

import Link from "next/link";
import { Check, MessagesSquare } from "lucide-react";

import { formatInteger } from "@/core/lib/commercial-units";
import { FILM_PRICING } from "@/modules/landing/domain/film/tanda4-content";
import {
  MONTHS_PER_YEAR,
  annualTotalCop,
  discountLabel,
  planListCop,
  planMonthlyCop,
  planUnitQuantity,
  volumeById,
  type PublicCatalog,
} from "@/modules/landing/domain/public-catalog";
import { FoundersBar } from "@/modules/landing/ui/components/FoundersBar";
import { VolumeChips } from "@/modules/landing/ui/components/VolumeChips";
import { SALES_PATH, signupHref, usePricingState } from "@/modules/landing/ui/components/pricing-state";
import {
  BILLING_PERIODS,
  formatCop,
  foundersDiscountBadge,
  planById,
  pricingPackages,
  type BillingPeriodId,
  type PricingPlan,
} from "@/modules/landing/ui/content/landing.content";

/**
 * Los precios de la película (plan §16.2): la piel en tinta de los mismos
 * paquetes de `/precios`. Estado, reloj de la promoción y enlaces salen de
 * `pricing-state.ts`, igual que en `PricingPlans`; las cifras, del catálogo.
 * Isla propia para que la home no cargue la tarjeta de `/precios` (TiltCard,
 * Reveal, SegmentedControl…): el presupuesto de `/` es de 200 kB.
 *
 * Las clases viven en `film/film-tanda4.css`; la entrada (una vez, al llegar)
 * la pone el motor con los `data-anim`. Sin motor, todo está en su sitio.
 */
export function FilmPricing({ catalog }: { catalog: PublicCatalog }) {
  const { twoAxis, volumeId, setVolumeId, period, setPeriod, clock, offerOpen } = usePricingState(catalog);
  const enterprise = planById("enterprise");

  return (
    <>
      {offerOpen && catalog.promotion ? (
        <div className="film-founders mt-10">
          <FoundersBar promotion={catalog.promotion} />
        </div>
      ) : null}

      <div data-anim="price-head" className="mt-8 flex justify-center">
        <FilmPeriodSwitch value={period} onChange={setPeriod} />
      </div>

      {twoAxis ? (
        <div className="mt-8">
          <VolumeChips volumes={catalog.volumes} value={volumeId} onChange={setVolumeId} />
        </div>
      ) : null}

      <div className="film-price-grid">
        {pricingPackages().map((plan) => (
          <div key={plan.id} data-anim="price-card">
            <FilmPlanCard
              plan={plan}
              catalog={catalog}
              volumeId={volumeId}
              period={period}
              offerOpen={offerOpen}
              clock={clock}
              twoAxis={twoAxis}
            />
          </div>
        ))}
      </div>

      {enterprise ? <FilmEnterpriseBand plan={enterprise} floorCop={catalog.enterpriseFloorCop} /> : null}
    </>
  );
}

/** Mensual/Anual en píldora: la opción activa en blanco, con su insignia. */
function FilmPeriodSwitch({ value, onChange }: { value: BillingPeriodId; onChange: (period: BillingPeriodId) => void }) {
  return (
    <div role="radiogroup" aria-label="Periodicidad de pago" className="film-price-switch">
      {BILLING_PERIODS.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          data-on={value === option.id ? "" : undefined}
          onClick={() => onChange(option.id)}
        >
          {option.label}
          {option.badge ? <span className="film-price-switch-badge">{option.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

/**
 * Las conversaciones que trae la tarjeta: con eje de volumen, las del tramo
 * elegido; sin él, la cuota que publica el catálogo. Sin cifra, no hay caja.
 */
function conversationsLabel(catalog: PublicCatalog, planId: string, volumeId: string, twoAxis: boolean): string | null {
  if (twoAxis) {
    const volume = volumeById(catalog, volumeId);
    return volume.conversations === null ? null : volume.label;
  }
  const quota = planUnitQuantity(catalog, planId, "ai_conversations");
  return quota === null ? null : formatInteger(quota);
}

function FilmPlanCard({
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
  const listCop = planListCop(catalog, plan.id, volumeId);
  const monthlyCop = planMonthlyCop(catalog, plan.id, volumeId, clock);
  const overCatalog = monthlyCop === null || listCop === null;
  const conversations = conversationsLabel(catalog, plan.id, volumeId, twoAxis);
  const annualBadge = BILLING_PERIODS.find((option) => option.id === "annual")?.badge ?? "";

  return (
    <article data-testid={`plan-${plan.id}`} className="film-price-card" data-featured={plan.featured ? "" : undefined}>
      <div className="film-price-top">
        <h3 className="film-price-name">{plan.name}</h3>
        {plan.badge ? <span className="film-price-pill">{plan.badge}</span> : null}
      </div>
      <p className="film-price-tagline">{plan.tagline}</p>

      {listCop === null || monthlyCop === null ? (
        <div className="film-price-amount">
          <p className="film-price-figure">A la medida</p>
          <p className="film-price-dim">Por encima del catálogo armamos el plan contigo.</p>
        </div>
      ) : (
        <FilmPrice
          plan={plan}
          listCop={listCop}
          monthlyCop={monthlyCop}
          period={period}
          discounted={offerOpen && monthlyCop < listCop}
          promotion={catalog.promotion}
          annualBadge={annualBadge}
        />
      )}

      {conversations ? (
        <p className="film-price-volume">
          <MessagesSquare aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.7} />
          <span>
            <b>{conversations}</b> {FILM_PRICING.volumeSuffix}
          </span>
        </p>
      ) : null}

      <p className="film-price-inherits">{plan.inheritsFrom ? `Todo lo de ${plan.inheritsFrom}, y además` : "Incluye"}</p>
      <ul className="film-price-bullets">
        {plan.bullets.map((bullet) => (
          <li key={bullet}>
            <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.2} />
            {bullet}
          </li>
        ))}
      </ul>

      <Link prefetch={false} className="film-price-cta" href={overCatalog ? SALES_PATH : signupHref(plan, volumeId, period, twoAxis)}>
        {overCatalog ? "Hablar con ventas" : plan.cta.label}
      </Link>
      <p className="film-price-micro">{overCatalog ? "Te respondemos el mismo día." : plan.ctaMicrocopy}</p>
    </article>
  );
}

/**
 * El precio de la película. En anual la cifra grande es el mensual equivalente
 * (once meses pagados repartidos en doce) y la nota da el total del año: las
 * dos cifras salen del mismo `monthlyCop` del catálogo.
 */
function FilmPrice({
  plan,
  listCop,
  monthlyCop,
  period,
  discounted,
  promotion,
  annualBadge,
}: {
  plan: PricingPlan;
  listCop: number;
  monthlyCop: number;
  period: BillingPeriodId;
  discounted: boolean;
  promotion: PublicCatalog["promotion"];
  annualBadge: string;
}) {
  const annual = period === "annual";
  const yearly = annualTotalCop(monthlyCop);
  const shown = formatCop(annual ? Math.round(yearly / MONTHS_PER_YEAR) : monthlyCop);
  const note = annual ? FILM_PRICING.annualNote(formatCop(yearly), annualBadge) : FILM_PRICING.monthlyNote;

  return (
    <div className="film-price-amount">
      <span className="sr-only">
        {`${shown} pesos colombianos al mes${annual ? `, pagando ${formatCop(yearly)} al año` : ""}${
          discounted ? `, antes ${formatCop(listCop)}, con el descuento de fundador` : ""
        }.`}
      </span>
      <div aria-hidden="true">
        {discounted ? <s className="film-price-dim">{formatCop(listCop)}</s> : null}
        <p className="film-price-line">
          <span className="film-price-figure">{shown}</span>
          <span className="film-price-dim">{plan.priceUnit}</span>
        </p>
        <p className="film-price-dim film-price-note">{note}</p>
        {discounted && promotion ? (
          <span className="film-price-founders">{foundersDiscountBadge(discountLabel(promotion))}</span>
        ) : null}
      </div>
    </div>
  );
}

/** Enterprise en franja aparte, como en `/precios`, con su piso del catálogo. */
function FilmEnterpriseBand({ plan, floorCop }: { plan: PricingPlan; floorCop: number | null }) {
  return (
    <>
      <div data-anim="price-ent" data-testid={`plan-${plan.id}`} className="film-price-ent">
        <h3 className="film-price-ent-name">{plan.name}</h3>
        <p className="film-price-ent-text">{plan.tagline}</p>
        <p className="film-price-ent-from">
          {floorCop === null ? (
            "A la medida"
          ) : (
            <>
              {FILM_PRICING.enterpriseFrom} <b>{formatCop(floorCop)}</b> {plan.priceUnit}
            </>
          )}
        </p>
        <Link prefetch={false} href={plan.cta.href} className="film-price-ent-cta">
          {plan.cta.label}
        </Link>
      </div>
      <p data-anim="price-ent" className="film-price-peruser">
        {FILM_PRICING.perUser}
      </p>
    </>
  );
}
