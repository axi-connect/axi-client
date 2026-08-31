import { Bot, HelpCircle, MoonStar, Smartphone } from "lucide-react";

import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { TiltCard } from "@/shared/components/ui/tilt-card";
import { PROBLEM } from "@/modules/landing/ui/content/landing.content";

/** Iconos sobrios por dolor (lucide, nada caricaturesco). */
const PAIN_ICONS = {
  "after-hours": MoonStar,
  "single-phone": Smartphone,
  "no-attribution": HelpCircle,
  "scary-bots": Bot,
} as const;

/**
 * §3 El problema — aversión a la pérdida. Fondo neutro, sin gradiente:
 * esta sección se lee, no se decora. Los cuatro dolores con el mismo peso.
 */
export default function LandingProblem() {
  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-20 md:py-28">
        <Reveal>
          <SectionHeading title={PROBLEM.title} intro={PROBLEM.intro} />
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {PROBLEM.pains.map((pain, i) => {
            const Icon = PAIN_ICONS[pain.id as keyof typeof PAIN_ICONS] ?? HelpCircle;
            return (
              <Reveal key={pain.id} delay={i * 0.08} className="h-full">
                <TiltCard depth={8} className="h-full">
                  <div className="border-border bg-card flex h-full flex-col gap-3 rounded-2xl border p-7 shadow-float">
                    <Icon aria-hidden className="text-brand size-5" />
                    <h3 className="text-lg leading-snug font-semibold">{pain.title}</h3>
                    <p className="text-muted-foreground text-[15px] leading-relaxed">{pain.body}</p>
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-10">
          <p className="text-foreground/80 max-w-2xl text-base font-medium">{PROBLEM.closing}</p>
        </Reveal>
      </div>
    </section>
  );
}
