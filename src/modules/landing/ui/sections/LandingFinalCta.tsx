import { FaWhatsapp } from "react-icons/fa";

import { Button } from "@/shared/components/ui/button";
import { BrandGradientCanvas } from "@/modules/landing/ui/components/BrandGradientCanvas";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { AgentMascot } from "@/modules/landing/ui/components/mockups/AgentMascot";
import { DemoLeadForm } from "@/modules/landing/ui/forms/DemoLeadForm";
import {
  buildWaLink,
  FINAL_CTA,
  LANDING_ANCHORS,
  WA_MESSAGES,
} from "@/modules/landing/ui/content/landing.content";

/**
 * §11 CTA final — el cierre. Segundo y último momento de gradiente tricolor
 * (eco del hero). Dos vías con igual jerarquía: el formulario de agendamiento
 * y el agente de Axi atendiendo su propio WhatsApp — la demo ES el producto.
 */
export default function LandingFinalCta() {
  const { whatsappCard } = FINAL_CTA;

  return (
    <section
      id={LANDING_ANCHORS.demo}
      className="relative w-full scroll-mt-24 overflow-hidden"
    >
      <BrandGradientCanvas
        className="absolute inset-0 h-full w-full"
        colorVars={["--axi-violet", "--axi-brand", "--axi-amber"]}
        speed={0.85}
        grain={0.6}
        opacity={0.5}
      />

      <div className="relative mx-auto w-full max-w-[1100px] px-6 py-20 md:py-28">
        <Reveal className="mb-14 text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {FINAL_CTA.title}
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-[680px] text-[17px] leading-relaxed">
            {FINAL_CTA.subtitle}
          </p>
        </Reveal>

        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {/* Vía 1 — formulario de agendamiento */}
          <Reveal className="h-full">
            <div className="glass-overlay h-full rounded-[26px] p-8">
              <DemoLeadForm />
            </div>
          </Reveal>

          {/* Vía 2 — el agente de Axi, ahora mismo */}
          <Reveal className="h-full">
            <div className="border-success/25 bg-success/5 relative flex h-full flex-col justify-center gap-4 rounded-[26px] border p-8 backdrop-blur-md">
              <AgentMascot
                variant="lumo"
                width={180}
                bob="slow"
                className="absolute -top-24 -right-4 max-lg:hidden"
              />
              <h3 className="text-xl font-semibold">{whatsappCard.title}</h3>
              <p className="text-muted-foreground text-[15px] leading-relaxed">
                {whatsappCard.body}
              </p>
              <Button
                asChild
                size="lg"
                className="bg-success text-success-foreground hover:bg-success/90 h-12 justify-center gap-2.5 text-base"
              >
                <a href={buildWaLink(WA_MESSAGES.finalCta)} target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp aria-hidden className="size-5" />
                  {whatsappCard.cta}
                </a>
              </Button>
              <p className="text-muted-foreground/80 text-[13px]">{whatsappCard.microcopy}</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
