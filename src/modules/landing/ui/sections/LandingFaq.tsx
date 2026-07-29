import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { FAQ, LANDING_ANCHORS } from "@/modules/landing/ui/content/landing.content";

/**
 * §10 Preguntas frecuentes — las objeciones que matan tratos en silencio,
 * escritas como las diría el cliente. Acordeón sobrio, sin decoración.
 */
export default function LandingFaq() {
  return (
    <section id={LANDING_ANCHORS.faq} className="w-full scroll-mt-24">
      <div className="mx-auto w-full max-w-[860px] px-6 py-20 md:py-28">
        <Reveal>
          <SectionHeading title={FAQ.title} align="center" />
        </Reveal>

        <Reveal className="mt-10">
          <Accordion type="single" collapsible className="flex flex-col gap-3">
            {FAQ.items.map((item) => (
              <AccordionItem
                key={item.q}
                value={item.q}
                className="border-border bg-card rounded-2xl border px-6 last:border-b"
              >
                <AccordionTrigger className="py-5 text-[16px] font-semibold hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 text-[15px] leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
