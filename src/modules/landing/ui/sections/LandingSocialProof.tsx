import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SOCIAL_PROOF } from "@/modules/landing/ui/content/landing.content";

/**
 * §2 Barra de prueba social — una confirmación al paso, no una sección:
 * tres negocios reales y visiblemente distintos entre sí.
 */
export default function LandingSocialProof() {
  return (
    <section className="border-border/60 w-full border-y">
      <Reveal className="mx-auto flex w-full max-w-[1100px] flex-col items-center gap-4 px-6 py-10 text-center">
        <span className="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">
          {SOCIAL_PROOF.kicker}
        </span>
        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm">
          {SOCIAL_PROOF.businesses.map((business) => (
            <span key={business.name}>
              <strong className="text-foreground/80 font-heading font-bold">{business.name}</strong>
              {" · "}
              {business.detail}
            </span>
          ))}
        </div>
        <span className="text-muted-foreground/80 text-[13px]">{SOCIAL_PROOF.closing}</span>
      </Reveal>
    </section>
  );
}
