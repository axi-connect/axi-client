import type { Metadata } from "next";

import { pageMetadata } from "@/core/seo/metadata";
import { JsonLd } from "@/core/seo/json-ld";
import { breadcrumbSchema } from "@/core/seo/site";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  GraduationCap,
  Shirt,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { BrandCard } from "@/shared/components/ui/brand-card";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { CASES } from "@/modules/landing/ui/content/landing.content";

/**
 * `/casos` — la prueba social, contra la objeción más cara del embudo: «mi
 * negocio es distinto».
 *
 * Dos bloques con propósitos distintos:
 *  1. Los tres pilotos reales, con las cifras **verificables** de su catálogo
 *     (185 productos y servicios entre los tres, con precios y fotos reales).
 *  2. Los cinco verticales de mayor encaje, que son el destino de la columna
 *     «Por industria» del mega-menú.
 *
 * HONESTIDAD: las cifras de conversión de `CASES` están marcadas `pending` en
 * el contenido de la landing —son estimaciones sin medición cerrada— así que
 * aquí NO se pintan. Se usan solo los datos que se pueden sostener: sector,
 * canal, tamaño y forma del catálogo. Un porcentaje inventado en esta página
 * cuesta la venta entera cuando el prospecto lo pregunta en la demo.
 */
export const metadata: Metadata = pageMetadata({
  title: "Casos",
  description:
    "Un restaurante en Palmira, una marca de ropa en Bogotá y un estudio de grabación: tres formas distintas de vender por chat con la misma configuración base de Axi Connect.",
  path: "/casos",
});

/** Datos verificables de cada piloto (knowledge-base §17.2). */
/**
 * Sin campo `channel` a propósito: los tres pilotos se montaron sobre el canal
 * `whatsapp_web`, que ya se retiró, y la migración al canal oficial no está
 * cerrada (market-study-2026-09.md §5.4). Afirmar un canal aquí sería cambiar un
 * claim obsoleto por otro; el catálogo sí es verificable y es lo que se pinta.
 */
const CASE_FACTS: Record<string, { catalog: string; proves: string }> = {
  joaos: {
    catalog: "37 productos en 5 categorías",
    proves: "Volumen alto, ticket bajo y decisión rápida: domicilios y para recoger, sin agenda y sin control de stock.",
  },
  savage: {
    catalog: "129 productos con variantes de talla · 385 imágenes",
    proves: "E-commerce conversacional puro: fotos por variante, envíos nacionales y búsqueda que tolera errores de tipeo.",
  },
  tbi: {
    catalog: "19 servicios y productos",
    proves: "Aquí lo que se vende es tiempo: disponibilidad real, reserva sin duplicar y recordatorios 24 h y 1 h antes.",
  },
};

type Vertical = {
  id: string;
  name: string;
  icon: LucideIcon;
  body: string;
  proof: string;
};

const VERTICALS: readonly Vertical[] = [
  {
    id: "retail",
    name: "Retail y moda",
    icon: Shirt,
    body: "Catálogo con variantes, tallas y stock por variante, con las fotos reales de cada una. El agente encuentra la prenda aunque se la pidan mal escrita y cierra el pedido con el inventario del sistema.",
    proof: "Savage — 129 productos, 385 imágenes",
  },
  {
    id: "comida",
    name: "Comida y restaurantes",
    icon: UtensilsCrossed,
    body: "Pedido a domicilio o para recoger tomado completo dentro del chat, con tus medios de pago y el comprobante verificado antes de despachar. Sin sacar al cliente a un carrito web.",
    proof: "Joao's Burguer — 37 productos",
  },
  {
    id: "servicios",
    name: "Servicios con agenda",
    icon: CalendarDays,
    body: "Clínicas estéticas, odontología, barberías, talleres y estudios: disponibilidad calculada desde el horario del negocio, la duración del servicio y la zona horaria, con recordatorios automáticos.",
    proof: "The Brothers Inc — 19 servicios",
  },
  {
    id: "educacion",
    name: "Educación y formación",
    icon: GraduationCap,
    body: "Matrícula por chat: el agente responde requisitos y fechas, captura los datos que tu institución necesita con formularios propios y abre la oportunidad en el pipeline sin que nadie la digite.",
    proof: "Encaje por capacidad, sin piloto todavía",
  },
  {
    id: "alto-ticket",
    name: "Alto ticket",
    icon: Building2,
    body: "Inmobiliaria y automotriz: la IA no cierra la venta, califica el lead. Responde en segundos a cualquier hora, filtra por presupuesto e intención y entrega al asesor un contacto puntuado con su historial.",
    proof: "Encaje por capacidad, sin piloto todavía",
  },
];

export default function CasosPage() {
  return (
    <div className="w-full">
      <JsonLd data={breadcrumbSchema(["/casos"])} />
      <section className="mx-auto w-full max-w-[1100px] px-6 pt-32 pb-14 sm:pt-40">
        <SectionHeading
          as="h1"
          kicker="Tres negocios, tres formas de vender"
          title={CASES.title}
          intro="Un restaurante de comida rápida, una marca de ropa urbana y un estudio de grabación. Catálogos reales, precios reales, fotos reales — y la misma configuración base, sin una línea de desarrollo a medida para ninguno."
        />
        <div className="mt-9 flex flex-wrap gap-3.5">
          <Button asChild size="lg" className="h-12 px-7 text-base">
            <Link href="/contacto">{CASES.cta}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
            <Link href="/precios">Ver los planes</Link>
          </Button>
        </div>
      </section>

      {/* ── Los tres pilotos ── */}
      <div className="mx-auto w-full max-w-[1100px] space-y-5 px-6 pb-16">
        {CASES.cases.map((item, index) => {
          const facts = CASE_FACTS[item.id];
          return (
            <section key={item.id} id={item.id} className="scroll-mt-28">
              <Reveal>
                <div className="border-border bg-card grid overflow-hidden rounded-2xl border md:grid-cols-[0.9fr_1.1fr]">
                  <div className="bg-secondary/40 relative min-h-56">
                    <Image
                      src={item.photoSrc}
                      alt={`${item.name} — ${item.sector}`}
                      fill
                      sizes="(min-width: 768px) 45vw, 100vw"
                      className="object-cover"
                      // Solo la primera imagen entra en el LCP; las otras dos
                      // están fuera de pantalla al cargar.
                      priority={index === 0}
                    />
                  </div>

                  <div className="flex flex-col gap-4 p-6 sm:p-8">
                    <div>
                      <h2 className="font-heading text-2xl font-bold tracking-tight">{item.name}</h2>
                      <p className="text-brand mt-1 text-sm font-medium">{item.sector}</p>
                    </div>

                    <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
                      {item.body}
                    </p>

                    <dl className="border-border/60 grid gap-3 border-t pt-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                          Catálogo real
                        </dt>
                        <dd className="mt-1 text-sm font-medium">{facts.catalog}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                          Qué demuestra
                        </dt>
                        <dd className="text-foreground/85 mt-1 text-sm leading-relaxed">
                          {facts.proves}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </Reveal>
            </section>
          );
        })}

        <Reveal>
          <p className="text-muted-foreground mx-auto max-w-3xl text-center text-sm leading-relaxed">
            <b className="text-foreground font-semibold">185 productos y servicios reales</b> entre
            los tres, con precios y fotos reales — un menú de domicilios, un catálogo de moda con
            variantes de talla y una agenda de servicios. Tres negocios que no se parecen en nada,
            atendidos por la misma configuración base.
          </p>
        </Reveal>
      </div>

      {/* ── Verticales de encaje: destino de «Por industria» del mega-menú ── */}
      <section className="border-border/60 w-full border-t">
        <div className="mx-auto w-full max-w-[1100px] px-6 py-16">
          <SectionHeading
            kicker="Por industria"
            title="Dónde encaja, y dónde lo decimos con franqueza"
            intro="El producto es el mismo; lo que cambia es la configuración. Estos son los cinco verticales de mayor encaje, y marcamos cuáles tienen piloto en producción y cuáles no."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {VERTICALS.map((vertical, index) => {
              const Icon = vertical.icon;
              return (
                <section
                  key={vertical.id}
                  id={vertical.id}
                  className="scroll-mt-28 last:md:col-span-2"
                >
                  <Reveal delay={index * 0.05}>
                    <BrandCard className="h-full gap-4 px-6 py-6">
                      <div className="relative flex items-center gap-3">
                        <span className="border-border bg-card flex size-10 items-center justify-center rounded-xl border">
                          <Icon aria-hidden="true" className="text-brand size-[1.125rem]" />
                        </span>
                        <h3 className="text-base font-semibold tracking-tight">{vertical.name}</h3>
                      </div>
                      <p className="text-muted-foreground relative text-sm leading-relaxed text-pretty">
                        {vertical.body}
                      </p>
                      <p className="text-muted-foreground border-border/60 relative border-t pt-3 text-xs">
                        {vertical.proof}
                      </p>
                    </BrandCard>
                  </Reveal>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1100px] px-6 py-20">
        <Reveal>
          <div className="border-border bg-card rounded-2xl border p-8 text-center sm:p-10">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              ¿Tu negocio no está en la lista?
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-pretty">
              En la demo lo vemos con tu tipo de negocio y estimamos contigo el volumen que
              manejas. Si no encaja, te lo decimos ahí mismo.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-7 text-base">
                <Link href="/contacto">Agenda tu demo</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
                <Link href="/integraciones">Ver las integraciones</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
