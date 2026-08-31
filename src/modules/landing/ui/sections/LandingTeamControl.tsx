import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { TiltCard } from "@/shared/components/ui/tilt-card";
import { InboxPreview } from "@/modules/landing/ui/components/mockups/InboxPreview";
import { TEAM_CONTROL } from "@/modules/landing/ui/content/landing.content";

/**
 * §7 Tu equipo, en control — para el jefe de atención que recomienda (o veta)
 * la compra: nadie pierde su trabajo, pierde lo repetitivo. Tono cálido:
 * aquí aparecen personas, con el inbox real en modo humano.
 */
export default function LandingTeamControl() {
  return (
    <section className="w-full">
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 px-6 py-20 md:py-28 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div>
          <Reveal>
            <SectionHeading title={TEAM_CONTROL.title} intro={TEAM_CONTROL.intro} />
          </Reveal>

          <div className="mt-10 flex flex-col gap-8">
            {TEAM_CONTROL.capabilities.map((capability, i) => (
              <Reveal key={capability.id} delay={i * 0.08}>
                <h3 className="text-lg leading-snug font-semibold">{capability.title}</h3>
                <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">
                  {capability.body}
                </p>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10">
            <p className="border-brand/40 text-foreground/85 border-l-2 pl-4 text-[15px] leading-relaxed">
              {TEAM_CONTROL.closingLead}
              <strong className="font-semibold">{TEAM_CONTROL.closingStrong}</strong>
              {TEAM_CONTROL.closingTail}
            </p>
          </Reveal>
        </div>

        <Reveal>
          {/* Radio 26px = el del InboxPreview, para que el glare recorte igual */}
          <TiltCard depth={5} className="rounded-[26px]">
            <InboxPreview />
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}
