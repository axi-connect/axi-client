import { Camera, Check, Instagram, ScanSearch, Smartphone, type LucideIcon } from "lucide-react";

import { BrandCard } from "@/shared/components/ui/brand-card";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { RecognitionScanner } from "@/modules/landing/ui/components/RecognitionScanner";
import { LANDING_ANCHORS, RECOGNITION } from "@/modules/landing/ui/content/landing.content";

const SOURCE_ICONS: Record<string, LucideIcon> = {
  photo: Camera,
  screenshot: Smartphone,
  share: Instagram,
};

/**
 * §5b Reconocimiento de producto — «El escáner» (plan F8 §4.1). Isla oscura
 * en AMBOS temas (`dark theme-dark-island`, como `/productos`): la animación
 * luce igual en claro y oscuro, y el violeta de los marcadores de IA gana
 * contraste. Va entre Métricas y «Tu equipo, en control»: los guardarraíles ya
 * son oscuros y dos islas seguidas se leerían como un solo bloque.
 *
 * Sin CTA propio: el flujo de la home sigue. El kicker va en violeta a mano
 * porque es un marcador de IA (F6, decisión 7); `SectionHeading` pinta el
 * kicker coral de la vista.
 */
export default function LandingRecognition() {
  return (
    <section
      id={LANDING_ANCHORS.recognition}
      className="dark theme-dark-island bg-background text-foreground relative w-full scroll-mt-24 overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 55%, color-mix(in srgb, var(--axi-violet) 16%, transparent), transparent 70%), radial-gradient(40% 50% at 12% 20%, color-mix(in srgb, var(--axi-brand) 10%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1200px] px-6 py-20 md:py-28">
        <Reveal>
          <p className="text-accent-violet mb-3 flex items-center gap-2 text-sm font-medium tracking-wide">
            <ScanSearch aria-hidden className="size-4" />
            {RECOGNITION.kicker}
          </p>
          <SectionHeading title={RECOGNITION.title} intro={RECOGNITION.intro} />
        </Reveal>

        <Reveal className="mt-11">
          <RecognitionScanner />
        </Reveal>

        <ul className="mt-10 grid gap-3 sm:grid-cols-3">
          {RECOGNITION.sources.map((source, i) => {
            const Icon = SOURCE_ICONS[source.id] ?? Camera;
            return (
              <li key={source.id}>
                <Reveal delay={i * 0.08} className="h-full">
                  <BrandCard surface="solid" className="flex h-full items-start gap-3.5 p-4">
                    <span className="bg-secondary text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">{source.title}</h3>
                      <p className="text-muted-foreground text-[13px] leading-relaxed">{source.body}</p>
                    </div>
                  </BrandCard>
                </Reveal>
              </li>
            );
          })}
        </ul>

        <ul className="text-muted-foreground mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          {RECOGNITION.facts.map((fact) => (
            <li key={fact} className="inline-flex items-center gap-2">
              <Check aria-hidden className="text-brand size-3.5 shrink-0" />
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
