import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { VaultRevealCard } from "@/modules/landing/ui/components/VaultRevealCard";
import { GUARDRAILS } from "@/modules/landing/ui/content/landing.content";

/** Esquinas "+" de la tarjeta interactiva (guiño técnico de la plantilla). */
function CornerMarks() {
  return (
    <>
      <span aria-hidden className="text-muted-foreground absolute -top-2.5 -left-2 text-[17px] leading-none">+</span>
      <span aria-hidden className="text-muted-foreground absolute -top-2.5 -right-2 text-[17px] leading-none">+</span>
      <span aria-hidden className="text-muted-foreground absolute -bottom-2.5 -left-2 text-[17px] leading-none">+</span>
      <span aria-hidden className="text-muted-foreground absolute -bottom-2.5 -right-2 text-[17px] leading-none">+</span>
    </>
  );
}

/**
 * §5 La objeción de la IA, de frente — "la bóveda". Oscura en AMBOS temas
 * como contraste deliberado (sensación de precisión/bóveda): el wrapper
 * fuerza la clase `dark`, y los tokens semánticos resuelven solos
 * (`@custom-variant dark` en globals.css). Cero adornos; el remate como reto.
 */
export default function LandingAiGuardrails() {
  return (
    <section className="dark bg-background text-foreground w-full">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-28">
        <Reveal>
          <SectionHeading title={GUARDRAILS.title} intro={GUARDRAILS.intro} />
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-8">
          {/* Cuatro garantías — celdas sólidas, mismo peso */}
          <div className="border-border grid overflow-hidden rounded-2xl border sm:grid-cols-2">
            {GUARDRAILS.guarantees.map((guarantee) => (
              <div
                key={guarantee.id}
                className="border-border bg-card border-b p-8 last:border-b-0 sm:nth-[3]:border-b-0 sm:odd:border-r"
              >
                <h3 className="text-[19px] leading-snug font-semibold">{guarantee.title}</h3>
                <p className="text-muted-foreground mt-2.5 text-[15px] leading-relaxed">
                  {guarantee.body}
                </p>
              </div>
            ))}
          </div>

          {/* Tarjeta interactiva: los datos pasan por el sistema */}
          <Reveal className="flex">
            <div className="border-border/80 relative flex flex-1 flex-col rounded-lg border p-4">
              <CornerMarks />
              <VaultRevealCard hint={GUARDRAILS.vault.hint} vocabulary={GUARDRAILS.vault.vocabulary} />
              <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                {GUARDRAILS.vault.caption}
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-14">
          <p className="font-heading max-w-[780px] text-2xl leading-snug font-bold tracking-tight sm:text-3xl">
            <span className="text-brand">{GUARDRAILS.punchlineLead}</span> {GUARDRAILS.punchline}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
