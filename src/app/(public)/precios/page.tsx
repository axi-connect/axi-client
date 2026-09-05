import type { Metadata } from "next";

import { pageMetadata } from "@/core/seo/metadata";
import { JsonLd } from "@/core/seo/json-ld";
import { breadcrumbSchema, faqSchema } from "@/core/seo/site";
import { pricingSchema } from "@/modules/landing/ui/seo/landing-schema";
import Link from "next/link";
import { BellRing, Database, Gauge, MessageCircle, ShieldCheck } from "lucide-react";

import { salesWhatsAppUrl } from "@/core/config/env";
import { Button } from "@/shared/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { BrandCard } from "@/shared/components/ui/brand-card";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { PricingPlans } from "@/modules/landing/ui/components/PricingPlans";
import { ModulePlans } from "@/modules/landing/ui/components/ModulePlans";
import { PRICING } from "@/modules/landing/ui/content/landing.content";
import { CATALOG_REVALIDATE_SECONDS, loadPublicCatalog } from "@/modules/landing/infrastructure/pricing-catalog.loader";

/**
 * `/precios` — página propia. Antes `/precios` redirigía a la ancla `#planes` de
 * la home (redirect retirado de `next.config.ts` en el mismo PR).
 *
 * Por qué deja de ser un ancla: «Precios» es la entrada más pulsada de
 * cualquier nav de SaaS, y llevaba a cargar una landing de doce secciones para
 * aterrizar a media página, sin URL compartible ni superficie de SEO propia.
 *
 * Reutiliza `PricingPlans` **entero** (franja de fundadores + conmutador de
 * periodicidad + chips de volumen + las tres tarjetas de Paquete + la franja de
 * Enterprise) y `ModulePlans` (los Módulos): el
 * precio vive en un solo sitio, así que la home y esta página no pueden
 * desincronizarse. Lo que añade es lo que la home no
 * tiene espacio para explicar: cómo se mide el consumo y qué pasa al pasarse.
 *
 * El alta es AUTOSERVICIO desde el registro (`/comenzar`, plan
 * onboarding_self_service_plan.md): los tres Paquetes y los cuatro Módulos
 * abren el registro con la oferta preseleccionada —y los Paquetes arrastran
 * además el volumen y la periodicidad elegidos aquí—; Enterprise sigue siendo
 * asistido porque exige base de datos dedicada.
 */
export const metadata: Metadata = pageMetadata({
  title: "Precios",
  description:
    "Elige las funciones que necesitas y el volumen de conversaciones por separado, o contrata Módulos de una sola capacidad. Empieza con 7 días gratis, sin tarjeta.",
  path: "/precios",
});

const GUARANTEES = [
  {
    icon: Gauge,
    title: "Eliges las funciones y el volumen por separado",
    body: "El Paquete decide qué puede hacer axi por ti; el volumen, cuántas conversaciones atiende al mes. Son dos elecciones distintas, así que hablar más no te obliga a comprar capacidades que no vas a usar.",
  },
  {
    icon: BellRing,
    title: "Te avisamos antes de que te sorprenda",
    body: "Alertas automáticas al 80 % y al 100 % del consumo, en la app y por correo. Sin duplicados y sin letra pequeña: el consumo se mide en tiempo real, por empresa.",
  },
  {
    icon: ShieldCheck,
    title: "Si te pasas, se pausa la IA — nunca tu operación",
    body: "Al llegar al tope, el agente de IA se pausa y tu equipo sigue atendiendo el 100 % de las conversaciones desde el mismo inbox. El negocio no se detiene por un límite de consumo.",
  },
  {
    icon: Database,
    title: "Tus datos, aislados por construcción",
    body: "Los datos de tu empresa están separados de cualquier otra por diseño del sistema, no por buenas intenciones. En Enterprise, tu empresa opera sobre una base de datos exclusiva.",
  },
] as const;

/**
 * Preguntas de precio, distintas a las de producto de la home (`FAQ`): aquí se
 * responde qué se mide, qué pasa al pasarse y cómo se entra. No se duplican.
 */
const PRICING_FAQ = [
  {
    q: "¿Cómo empiezo? ¿Puedo registrarme solo?",
    a: "Sí. En «Comenzar» creas tu empresa y tu cuenta en tres pasos y entras directo a configurarla con guía: eliges tu tipo de negocio, subes tu catálogo en Excel, PDF o una foto para que la IA lo arme, creas tu agente desde una plantilla y conectas tu WhatsApp. Sin tarjeta y con 7 días de prueba. Enterprise se activa con nuestro equipo.",
  },
  {
    q: "¿Qué es un Módulo y en qué se diferencia de un Paquete?",
    a: "Un Paquete trae el producto completo y su precio depende del volumen de conversaciones. Un Módulo abre una sola capacidad —llamadas, captación de leads, CRM o agenda— con su propio volumen mensual, para negocios que ya operan con otra herramienta y solo necesitan lo que les falta. Se contratan sueltos y no se combinan con un Paquete: si necesitas dos o más capacidades, el Paquete sale mejor.",
  },
  {
    q: "¿Qué incluye la prueba de 7 días?",
    a: "El producto completo, sin funciones recortadas y sin tarjeta de crédito. Tiene sus propios límites de consumo, que son reales: es el producto de verdad con topes de prueba, no una barra libre. Si no sigues, tus datos quedan intactos.",
  },
  {
    q: "¿Qué se mide exactamente?",
    a: "Diez métricas por empresa y en tiempo real: tokens de entrada y de salida de la IA, peticiones, caracteres de voz, mensajes enviados y recibidos, plantillas, llamadas a APIs externas, conversaciones activas y almacenamiento. De las diez, solo tres tienen costo unitario propio.",
  },
  {
    q: "¿Qué pasa si me paso del volumen del plan?",
    a: "Por defecto se pausa el agente de IA y tu equipo sigue atendiendo todo desde el inbox. Los topes son configurables por métrica y período, y cada uno puede bloquear, degradar o solo notificar según lo que acordemos contigo.",
  },
  {
    q: "¿Qué le pago a Meta, aparte del plan?",
    a: "Meta cobra por plantilla entregada, y la tarifa depende de la categoría. La categoría de servicio — toda la atención del agente dentro de la ventana de 24 horas que abre tu cliente — es gratis. Se paga cuando tú inicias la conversación: campañas de marketing y recordatorios fuera de esa ventana.",
  },
  {
    q: "¿Cómo se factura?",
    a: "Suscripción mensual por empresa, con la capa de consumo medido debajo. El ciclo de facturación se define por empresa y todo el consumo queda auditado mes a mes, así que la factura se puede revisar línea por línea.",
  },
] as const;

/** ISR de un minuto (D11): la misma lectura alimenta las tarjetas y el JSON-LD. */
export const revalidate = CATALOG_REVALIDATE_SECONDS;

export default async function PreciosPage() {
  const catalog = await loadPublicCatalog();
  return (
    <div className="w-full">
      <JsonLd data={pricingSchema(catalog)} />
      <JsonLd data={faqSchema(PRICING_FAQ)} />
      <JsonLd data={breadcrumbSchema(["/precios"])} />
      <section className="mx-auto w-full max-w-[1200px] px-6 pt-32 pb-4 sm:pt-40">
        <SectionHeading as="h1" kicker={PRICING.kicker} title={PRICING.title} intro={PRICING.intro} align="center" className="mx-auto" />
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-6 pb-16">
        <PricingPlans catalog={catalog} />

        <Reveal className="mt-8">
          <p className="text-muted-foreground mx-auto max-w-2xl text-center text-sm leading-relaxed">
            {PRICING.microcopy}
          </p>
        </Reveal>
      </section>

      <ModulePlans catalog={catalog} />

      {/* ── Lo que la home no tiene espacio para explicar ── */}
      <section className="border-border/60 w-full border-t">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
          <SectionHeading
            kicker="Sin sorpresas en la factura"
            title="Cómo funciona el consumo, dicho antes de que lo preguntes"
            intro="Vender IA sostenible obliga a medir. Esto es exactamente qué se mide, qué pasa cuando llegas al tope y qué no cambia nunca."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {GUARANTEES.map((item, index) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delay={index * 0.05}>
                  <BrandCard className="h-full gap-4 px-6 py-6">
                    <div className="relative flex items-center gap-3">
                      <span className="border-border bg-card flex size-10 items-center justify-center rounded-xl border">
                        <Icon aria-hidden="true" className="text-brand size-[1.125rem]" />
                      </span>
                      <h3 className="text-base font-semibold tracking-tight">{item.title}</h3>
                    </div>
                    <p className="text-muted-foreground relative text-sm leading-relaxed text-pretty">
                      {item.body}
                    </p>
                  </BrandCard>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ de precio ── */}
      <section className="border-border/60 w-full border-t">
        <div className="mx-auto w-full max-w-[900px] px-6 py-16">
          <SectionHeading title="Preguntas sobre el precio" align="center" className="mx-auto" />

          <Reveal className="mt-10">
            <Accordion type="single" collapsible className="border-border/60 rounded-2xl border px-5">
              {PRICING_FAQ.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger className="text-left text-base">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed text-pretty">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>

          <Reveal className="mt-8">
            <p className="text-muted-foreground text-center text-sm">
              ¿Te falta una?{" "}
              <Link href="/#preguntas" className="text-brand hover:underline">
                Las preguntas de producto están en la home
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1100px] px-6 py-20">
        <Reveal>
          <div className="border-border bg-card rounded-2xl border p-8 text-center sm:p-10">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Si no sabes cuántas conversaciones manejas, lo estimamos contigo
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-pretty">
              30 minutos. Te mostramos una venta completa —del «hola» al pago verificado— con un
              negocio como el tuyo, y salimos con tu tramo de volumen estimado.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-7 text-base">
                <Link href="/contacto">Agenda tu demo</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
                <a
                  href={salesWhatsAppUrl("Hola, quiero entender los planes de Axi Connect para mi negocio.")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle aria-hidden="true" className="size-4" />
                  Pregúntanos por WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
