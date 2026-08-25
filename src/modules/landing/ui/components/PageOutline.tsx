import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { Reveal } from "@/modules/landing/ui/components/Reveal";

export type OutlineSection = {
  /** Ancla que enlaza el navbar. Debe existir antes de publicar el enlace. */
  id: string;
  title: string;
  description: string;
};

/**
 * Andamio PROVISIONAL de las páginas de producto y soluciones.
 *
 * Existe por una razón concreta de secuencia: el navbar (F2) ya enlaza estas
 * rutas y sus anclas, y un enlace a una ruta inexistente no da 404 para un
 * visitante anónimo — el middleware lo manda al login, que es una señal
 * comercial peor. Este andamio garantiza que cada enlace del navbar aterrice en
 * una página coherente y que cada ancla resuelva desde el primer día.
 *
 * Lo reemplazan las fases F5 (`/soluciones`) y F6 (`/productos`), cada una con
 * su propio plan: ver `docs/plans/public-gtm-plan.md` §Gobernanza. Cuando esas
 * fases entren, este componente debería quedarse sin consumidores y borrarse.
 */
export function PageOutline({
  kicker,
  title,
  intro,
  sections,
  ctaLabel = "Agenda tu demo",
  ctaHref = "/contacto",
  footerNote,
}: {
  kicker?: string;
  title: ReactNode;
  intro: ReactNode;
  sections: readonly OutlineSection[];
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: ReactNode;
}) {
  return (
    <div className="w-full">
      <section className="mx-auto w-full max-w-[1200px] px-6 pt-32 pb-16 sm:pt-40">
        <SectionHeading as="h1" kicker={kicker} title={title} intro={intro} />
        <div className="mt-9 flex flex-wrap gap-3.5">
          <Button asChild size="lg" className="h-12 px-7 text-base">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
            <Link href="/#planes">Ver los planes</Link>
          </Button>
        </div>
      </section>

      <div className="border-border/60 border-t">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="border-border/60 scroll-mt-24 border-b last:border-b-0"
          >
            <Reveal className="mx-auto w-full max-w-[1200px] px-6 py-14">
              <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                {section.title}
              </h2>
              <p className="text-muted-foreground mt-4 max-w-[68ch] text-base leading-relaxed text-pretty">
                {section.description}
              </p>
            </Reveal>
          </section>
        ))}
      </div>

      <section className="mx-auto w-full max-w-[1200px] px-6 py-20 text-center">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          Míralo funcionando con un negocio como el tuyo
        </h2>
        {footerNote ? (
          <p className="text-muted-foreground mx-auto mt-4 max-w-[60ch] text-base leading-relaxed text-pretty">
            {footerNote}
          </p>
        ) : null}
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="h-12 px-7 text-base">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
