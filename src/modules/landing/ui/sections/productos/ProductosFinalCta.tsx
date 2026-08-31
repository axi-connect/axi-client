import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { PRODUCTOS_CTA } from "@/modules/landing/ui/content/productos.content";

/**
 * §8 — el cierre: isla oscura de marca (misma losa que `FoundersBar`) con un
 * solo CTA a `/contacto` (regla F6: un CTA final, sin bifurcaciones).
 */
export default function ProductosFinalCta() {
  return (
    <section aria-label="Agenda tu demo" className="w-full px-6 py-20 md:py-24">
      <Reveal className="mx-auto w-full max-w-[1100px]">
        <div className="dark theme-dark-island bg-founders-slab text-foreground relative overflow-hidden rounded-3xl border border-white/10 px-8 py-14 text-center md:px-14 md:py-20">
          <h2 className="font-heading mx-auto max-w-[18ch] text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {PRODUCTOS_CTA.title}
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-[52ch] text-pretty">
            {PRODUCTOS_CTA.body}
          </p>
          <Button asChild size="lg" className="mt-8 h-12 px-8 text-base">
            <Link href={PRODUCTOS_CTA.cta.href}>{PRODUCTOS_CTA.cta.label}</Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
