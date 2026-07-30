import Image from "next/image";

import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { TiltCard } from "@/modules/landing/ui/components/TiltCard";
import { CountUpNumber } from "@/modules/landing/ui/components/CountUpNumber";
import { Button } from "@/shared/components/ui/button";
import { CASES, LANDING_ANCHORS } from "@/modules/landing/ui/content/landing.content";

/**
 * §8 Casos — nombre, sector y una cifra por vertical del ICP (comida,
 * moda, servicios con agenda). Las cifras llevan el badge "CIFRA PENDIENTE"
 * hasta validar los datos reales de los pilotos (TODO en landing.content).
 */
export default function LandingCases() {
  return (
    <section id={LANDING_ANCHORS.cases} className="w-full scroll-mt-24">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-28">
        <Reveal>
          <SectionHeading title={CASES.title} />
        </Reveal>

        <div className="mt-12 grid items-start gap-5 md:grid-cols-3">
          {CASES.cases.map((businessCase, i) => {
            /* Tipo ancho a propósito: en el contenido photoSrc puede ser URL,
               null o undefined según lo vaya llenando negocio — sin esto, un
               literal siempre-truthy colapsa la rama del placeholder a never */
            const photoSrc: string | null | undefined = businessCase.photoSrc;
            return (
            <Reveal key={businessCase.id} delay={i * 0.08} className="h-full">
              <TiltCard depth={8} className="h-full">
                <div className="border-border bg-card flex h-full flex-col overflow-hidden rounded-2xl border shadow-float">
                  {/* Foto del negocio: real si hay photoSrc, placeholder si no */}
                  {photoSrc ? (
                    <div className="border-border/70 relative aspect-[16/9] border-b">
                      <Image
                        src={photoSrc}
                        alt={businessCase.name}
                        fill
                        sizes="(min-width: 768px) 33vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="border-border/70 bg-secondary/50 text-muted-foreground flex aspect-[16/9] items-center justify-center border-b border-dashed p-4 text-center text-xs leading-snug">
                      {businessCase.photoPlaceholder}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <div>
                      <h3 className="font-heading text-lg font-bold">{businessCase.name}</h3>
                      <span className="text-muted-foreground text-[13px]">{businessCase.sector}</span>
                    </div>
                    <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
                      {businessCase.body}
                    </p>
                    <div className="border-border/70 mt-1 border-t pt-4">
                      <p className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
                        <CountUpNumber
                          value={businessCase.stat.value}
                          decimals={businessCase.stat.decimals}
                          prefix={businessCase.stat.prefix}
                          suffix={businessCase.stat.suffix}
                        />
                      </p>
                      <p className="text-muted-foreground mt-1 text-[13px]">
                        {businessCase.stat.caption}
                      </p>
                      {businessCase.stat.pending ? (
                        <span className="bg-secondary text-muted-foreground mt-3 inline-block rounded-full px-2.5 py-1 font-mono text-[10px] tracking-wide">
                          {CASES.pendingBadge}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-12 flex justify-center">
          <Button asChild size="lg" variant="outline" className="h-11 px-6">
            <a href={`#${LANDING_ANCHORS.demo}`}>{CASES.cta}</a>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
