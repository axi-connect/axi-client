import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { TerminalMockup } from "@/modules/landing/ui/components/mockups/TerminalMockup";
import { TERMINAL } from "@/modules/landing/ui/content/landing.content";

/**
 * §10b El futuro es conversacional — la venta contada como una terminal en
 * vivo (guiño técnico de la plantilla v2). La superficie es oscura en ambos
 * temas: es una terminal (misma técnica de wrapper `dark` que la bóveda).
 */
export default function LandingTerminal() {
  return (
    <section className="dark bg-background text-foreground border-border/60 w-full border-t">
      <div className="mx-auto w-full max-w-[960px] px-6 py-20 md:py-24">
        <Reveal>
          <SectionHeading title={TERMINAL.title} intro={TERMINAL.intro} align="center" />
        </Reveal>
        <Reveal className="mt-10">
          <TerminalMockup
            windowTitle={TERMINAL.windowTitle}
            prompt={TERMINAL.prompt}
            script={TERMINAL.script}
          />
        </Reveal>
      </div>
    </section>
  );
}
