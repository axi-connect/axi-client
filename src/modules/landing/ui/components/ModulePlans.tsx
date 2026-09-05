import { Check } from "lucide-react";

import { BeamsBackground } from "@/shared/components/ui/beams-background";
import { ModuleCard } from "@/modules/landing/ui/components/ModuleCard";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { modulePriceCop, type PublicCatalog } from "@/modules/landing/domain/public-catalog";
import { LANDING_ANCHORS, MODULES, MODULES_SECTION } from "@/modules/landing/ui/content/landing.content";

/**
 * §9b Módulos — la banda que va debajo de los Paquetes, en la home y en
 * `/precios`. Es RSC: la única interacción (tilt, haces) vive en hojas de
 * cliente. Los precios llegan del catálogo público; sin catálogo, cada tarjeta
 * dice «precio a consulta» y manda a ventas.
 *
 * `relative isolate`: el canvas de haces (`-z-20`) y el velo (`-z-10`) tienen
 * que quedar bajo el contenido de ESTA sección y no colarse bajo la página.
 */
export function ModulePlans({
  catalog,
  headingAs = "h2",
}: {
  catalog: PublicCatalog | null;
  headingAs?: "h1" | "h2";
}) {
  return (
    <section
      id={LANDING_ANCHORS.modules}
      className="border-border/60 relative isolate w-full overflow-hidden border-t scroll-mt-24"
    >
      <BeamsBackground />
      <div aria-hidden="true" className="beams-veil pointer-events-none absolute inset-0 -z-10" />

      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-28">
        <Reveal>
          <SectionHeading
            as={headingAs}
            kicker={MODULES_SECTION.kicker}
            title={MODULES_SECTION.title}
            intro={MODULES_SECTION.intro}
            align="center"
            className="max-w-3xl"
          />
        </Reveal>

        <div className="mt-14 grid items-stretch gap-6 md:grid-cols-2 md:gap-7">
          {MODULES.map((offer, i) => (
            <Reveal key={offer.id} delay={i * 0.06} className="h-full">
              <ModuleCard
                offer={offer}
                priceCop={catalog === null ? null : modulePriceCop(catalog, offer.offer_code)}
              />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-7">
          <ul
            aria-label={MODULES_SECTION.includesLabel}
            className="text-muted-foreground mx-auto flex max-w-4xl flex-wrap justify-center gap-x-5 gap-y-2 text-[0.8125rem]"
          >
            {MODULES_SECTION.includes.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <Check aria-hidden="true" className="text-brand size-3.5" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed">
            {MODULES_SECTION.note}{" "}
            <a href={`#${LANDING_ANCHORS.pricing}`} className="text-brand hover:underline">
              {MODULES_SECTION.noteLink}
            </a>
            {MODULES_SECTION.noteTail}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
