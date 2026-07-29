import { Check } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { TiltCard } from "@/modules/landing/ui/components/TiltCard";
import { LANDING_ANCHORS, PRICING } from "@/modules/landing/ui/content/landing.content";

/**
 * §9 Planes — la unidad es el volumen de conversaciones/mes (la historia del
 * pricing, siempre visible). Máximo 5 bullets por plan; la tarjeta central
 * elevada con borde coral. El precio exacto se conversa en la demo.
 */
export default function LandingPricing() {
  return (
    <section id={LANDING_ANCHORS.pricing} className="w-full scroll-mt-24">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-28">
        <Reveal>
          <SectionHeading title={PRICING.title} intro={PRICING.intro} align="center" className="max-w-3xl" />
        </Reveal>

        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
          {PRICING.plans.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 0.08} className="h-full">
              <TiltCard depth={6} className="h-full">
                <div
                  className={cn(
                    "bg-card relative flex h-full flex-col gap-5 rounded-2xl border p-8",
                    plan.featured
                      ? "border-brand shadow-overlay lg:-translate-y-3"
                      : "border-border shadow-float",
                  )}
                >
                  {"badge" in plan && plan.badge ? (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{plan.badge}</Badge>
                  ) : null}

                  <div>
                    <h3 className="font-heading text-xl font-bold">{plan.name}</h3>
                    <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                      {plan.tagline}
                    </p>
                  </div>

                  <p className="flex flex-wrap items-baseline gap-x-2">
                    {plan.pricePrefix ? (
                      <span className="text-muted-foreground text-sm">{plan.pricePrefix}</span>
                    ) : null}
                    <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
                      {plan.price}
                    </span>
                    {plan.priceUnit ? (
                      <span className="text-muted-foreground text-sm">{plan.priceUnit}</span>
                    ) : null}
                  </p>

                  <ul className="flex flex-1 flex-col gap-3">
                    {plan.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5 text-sm leading-relaxed">
                        <Check aria-hidden className="text-brand mt-0.5 size-4 shrink-0" />
                        {bullet}
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    size="lg"
                    variant={plan.featured ? "default" : "outline"}
                    className="h-11 w-full"
                  >
                    <a href={`#${LANDING_ANCHORS.demo}`}>{plan.cta}</a>
                  </Button>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10">
          <p className="text-muted-foreground mx-auto max-w-2xl text-center text-sm leading-relaxed">
            {PRICING.microcopy}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
