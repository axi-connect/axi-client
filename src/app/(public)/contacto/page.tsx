import type { Metadata } from "next";

import { pageMetadata } from "@/core/seo/metadata";
import { JsonLd } from "@/core/seo/json-ld";
import { breadcrumbSchema, contactPageSchema } from "@/core/seo/site";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { salesWhatsAppUrl } from "@/core/config/env";
import { Button } from "@/shared/components/ui/button";
import { DemoLeadForm } from "@/modules/landing/ui/forms/DemoLeadForm";
import {
  CONTACT,
  FINAL_CTA,
  WA_MESSAGES,
} from "@/modules/landing/ui/content/landing.content";

/**
 * `/contacto` — destino único de conversión fuera de la home.
 *
 * Existe porque los CTA de `/productos`, `/soluciones`, el navbar, el footer y
 * el marketplace necesitan un aterrizaje propio: mandarlos a la ancla `#demo` de
 * la home obliga a cargar la landing completa y pierde el contexto de dónde
 * venía el visitante. `/demo` redirige aquí (next.config.ts).
 *
 * Reutiliza `DemoLeadForm` y el copy de §11 — no se duplica ni el formulario ni
 * los textos.
 *
 * ⚠️ El formulario NO persiste el lead: `createDemoLead` sigue simulado. La
 * conversión real es el WhatsApp que abre al enviar. El contrato del endpoint
 * pendiente está en `docs/plans/public-gtm-plan.md` §Requerimiento para
 * axi-server.
 */
export const metadata: Metadata = pageMetadata({
  title: "Agenda tu demo",
  description:
    "30 minutos con un negocio como el tuyo: te mostramos una venta completa, del «hola» al pago verificado, y el embudo que dice cuánto produjo.",
  path: "/contacto",
  ogTitle: "Agenda tu demo de Axi Connect",
});

export default function ContactoPage() {
  return (
    <div className="w-full">
      <JsonLd data={contactPageSchema()} />
      <JsonLd data={breadcrumbSchema(["/contacto"])} />
      <section className="mx-auto w-full max-w-[1100px] px-6 pt-32 pb-20 sm:pt-40">
        <div className="max-w-3xl">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            {FINAL_CTA.title}
          </h1>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed text-pretty">
            {FINAL_CTA.subtitle}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Superficie SÓLIDA, no glass: DESIGN §5.1 prohíbe glass en
              formularios, y aquí no hay nada moviéndose detrás que justifique
              arriesgar legibilidad. */}
          <div className="bg-card border-border rounded-xl border p-6 sm:p-8">
            <DemoLeadForm />
            <p className="text-muted-foreground mt-5 border-t border-border/60 pt-4 text-xs leading-relaxed">
              Al enviar tus datos aceptas nuestra{" "}
              <Link href="/legal/privacidad" className="text-brand hover:underline">
                política de privacidad
              </Link>
              . Los usamos solo para contactarte por tu demo.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-card border-border rounded-xl border p-6 sm:p-8">
              <h2 className="font-heading text-xl font-bold tracking-tight">
                {FINAL_CTA.whatsappCard.title}
              </h2>
              <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed text-pretty">
                {FINAL_CTA.whatsappCard.body}
              </p>
              <Button asChild size="lg" variant="outline" className="mt-6 h-12 w-full text-base">
                <a
                  href={salesWhatsAppUrl(WA_MESSAGES.finalCta)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle aria-hidden="true" className="size-4" />
                  {FINAL_CTA.whatsappCard.cta}
                </a>
              </Button>
              <p className="text-muted-foreground/80 mt-4 text-[13px] leading-relaxed">
                {FINAL_CTA.whatsappCard.microcopy}
              </p>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 sm:p-8">
              <h2 className="text-base font-semibold">{CONTACT.title}</h2>
              <dl className="mt-4 space-y-3 text-sm">
                {CONTACT.details.map((detail) => (
                  <div key={detail.label} className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground text-xs">{detail.label}</dt>
                    <dd className="text-foreground">
                      {detail.href ? (
                        <a href={detail.href} className="hover:text-brand transition-colors">
                          {detail.value}
                        </a>
                      ) : (
                        detail.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        <div className="border-border/60 mt-14 flex flex-wrap items-center justify-between gap-4 border-t pt-8">
          <p className="text-muted-foreground text-sm">
            ¿Prefieres ver primero cuánto cuesta?
          </p>
          <Button asChild variant="outline">
            <Link href="/#planes">Ver los planes</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
