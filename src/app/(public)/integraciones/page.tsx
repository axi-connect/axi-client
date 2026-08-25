import type { Metadata } from "next";

import { pageMetadata } from "@/core/seo/metadata";
import { JsonLd } from "@/core/seo/json-ld";
import { breadcrumbSchema } from "@/core/seo/site";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Instagram,
  MessageCircle,
  MessagesSquare,
  Mic,
  ShoppingBag,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/core/lib/utils";
import { salesWhatsAppUrl } from "@/core/config/env";
import { Button } from "@/shared/components/ui/button";
import { BrandCard } from "@/shared/components/ui/brand-card";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";

/**
 * `/integraciones` — responde la primera pregunta de todo prospecto: «¿funciona
 * con lo que ya tengo?».
 *
 * Existe porque era el hueco del embudo que ninguna página cubría: el visitante
 * llegaba a /productos, entendía qué hace axi, y se iba sin saber si sirve para
 * su WhatsApp, su Instagram o su Shopify.
 *
 * REGLA DE HONESTIDAD (knowledge-base §13.3): lo construido y lo probado no son
 * lo mismo, y esta página no los confunde. Instagram y Messenger están
 * integrados de verdad pero **pendientes de la aprobación de permisos de Meta**,
 * y WhatsApp Web es un canal *best effort*. Decirlo aquí cuesta menos que
 * decirlo en la demo.
 */
export const metadata: Metadata = pageMetadata({
  title: "Integraciones",
  description:
    "WhatsApp (tu número actual o la API oficial), Instagram, Messenger, Shopify y los medios de pago que usa Colombia. Conecta lo que ya tienes y empieza a vender el mismo día.",
  path: "/integraciones",
});

type IntegrationStatus = "probado" | "pendiente" | "best-effort";

const STATUS_META: Record<
  IntegrationStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  probado: {
    label: "Probado con clientes reales",
    icon: CheckCircle2,
    // Verde semántico: es estado del sistema, no acento de marca (DESIGN §3.4).
    className: "text-success border-success/30 bg-success/10",
  },
  "best-effort": {
    label: "No oficial · best effort",
    icon: TriangleAlert,
    className: "text-warning border-warning/30 bg-warning/10",
  },
  pendiente: {
    label: "Pendiente de aprobación de Meta",
    icon: Clock3,
    className: "text-muted-foreground border-border bg-secondary",
  },
};

type Integration = {
  id: string;
  name: string;
  icon: LucideIcon;
  status: IntegrationStatus;
  claim: string;
  body: string;
  facts: readonly string[];
};

const CHANNELS: readonly Integration[] = [
  {
    id: "whatsapp-web",
    name: "WhatsApp Web · tu número actual",
    icon: MessageCircle,
    status: "best-effort",
    claim: "Conecta el número que ya usas y vende hoy.",
    body:
      "Se vincula escaneando un código, como el WhatsApp Web del navegador: sin verificación de Meta, sin línea nueva y sin costo por conversación. Es la rampa de entrada — cuando tu volumen justifique formalizar, migras al canal oficial sin rehacer nada. Corre en un proceso aislado, así que su fragilidad nunca alcanza al resto de la plataforma.",
    facts: [
      "La sesión sobrevive a reinicios sin volver a escanear",
      "Sin ventana de 24 horas y sin plantillas",
      "Soporta voz del agente",
      "Los tres negocios piloto operan hoy por aquí",
    ],
  },
  {
    id: "whatsapp-cloud",
    name: "WhatsApp Cloud API",
    icon: MessagesSquare,
    status: "probado",
    claim: "El canal oficial, con alta de un botón.",
    body:
      "Crear la app, verificar el negocio, pedir permisos, configurar webhooks y copiar credenciales era el peor momento de la adopción. Aquí es un flujo guiado dentro del panel: autorizas desde una ventana de Meta y el canal queda operativo, con su número registrado y su webhook conectado, sin pegar un token en ningún campo.",
    facts: [
      "Plantillas aprobadas para reabrir conversación fuera de la ventana de 24 h",
      "Puedes usar tu propia app de Meta, no solo la de axi",
      "El canal se vigila solo: token que caduca, desconexión, cambio de estado",
      "Soporta voz del agente",
    ],
  },
  {
    id: "instagram",
    name: "Instagram Direct",
    icon: Instagram,
    status: "pendiente",
    claim: "El mismo botón, el mismo inbox.",
    body:
      "Adaptador propio, webhook enrutado y envío funcionando: aguas abajo del punto de entrada el sistema no distingue el canal, así que el agente, el catálogo y la medición son los mismos. Lo que falta no es código — es la aprobación por parte de Meta de los permisos de páginas e Instagram, que es un trámite con sus tiempos.",
    facts: [
      "Identidad unificada del contacto: la misma persona escriba por donde escriba",
      "Sin plantillas y sin voz",
      "No duplica infraestructura: un solo punto de entrada para todos los canales",
    ],
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    icon: MessageCircle,
    status: "pendiente",
    claim: "Integrado por el mismo camino que Instagram.",
    body:
      "Mismo adaptador, mismo webhook y mismo pipeline que el resto. También espera la aprobación de permisos de Meta, y comparte con Instagram las dos limitaciones del canal: sin plantillas y sin voz.",
    facts: [
      "Las diferencias de capacidad se resuelven en el adaptador, nunca en el agente",
      "Añadir un canal nuevo no toca el motor de IA",
    ],
  },
];

const EXTRAS: readonly Integration[] = [
  {
    id: "shopify",
    name: "Shopify",
    icon: ShoppingBag,
    status: "probado",
    claim: "Tu tienda y el chat, con un solo inventario.",
    body:
      "El catálogo de tu tienda alimenta al agente y los pedidos que cierra la conversación viajan a Shopify. Deja de haber dos verdades sobre el stock y el precio.",
    facts: [
      "Productos, variantes y precios sincronizados",
      "El pedido del chat aterriza en tu tienda",
      "Descuentos y promociones respetados",
    ],
  },
  {
    id: "pagos",
    name: "Nequi · Daviplata · Bancolombia",
    icon: CreditCard,
    status: "probado",
    claim: "Los medios de pago que usa Colombia, de fábrica.",
    body:
      "El agente comparte tus medios de pago dentro de la conversación, registra el comprobante y tu equipo lo verifica antes de despachar. La verificación es humana a propósito: es plata.",
    facts: [
      "Nequi, Daviplata, Bancolombia, efectivo, datáfono y link de pago",
      "Comprobante registrado con verificación humana",
      "Precios formateados en español colombiano",
    ],
  },
  {
    id: "voz",
    name: "Voz del agente",
    icon: Mic,
    status: "probado",
    claim: "Contesta hablando cuando el cliente habla.",
    body:
      "Catálogo curado de diez voces en español latino, una por personalidad de agente. Si algo falla, degrada a texto en silencio: el cliente nunca se queda esperando. Y las notas de voz que te manden se transcriben automáticamente.",
    facts: [
      "Disponible en WhatsApp (oficial y no oficial)",
      "Topes y longitud máxima aplicados en el servidor",
      "Consumo medido con su propia métrica",
    ],
  },
];

function StatusChip({ status }: { status: IntegrationStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        meta.className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {meta.label}
    </span>
  );
}

function IntegrationBlock({ item, index }: { item: Integration; index: number }) {
  const Icon = item.icon;
  return (
    <section id={item.id} className="scroll-mt-28">
      <Reveal>
        <BrandCard className="gap-5 px-6 py-7 sm:px-8 sm:py-8">
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="border-border bg-card flex size-11 items-center justify-center rounded-xl border">
                <Icon aria-hidden="true" className="text-brand size-5" />
              </span>
              <div>
                <h2 className="font-heading text-xl font-bold tracking-tight">{item.name}</h2>
                <p className="text-brand text-sm font-medium">{item.claim}</p>
              </div>
            </div>
            <StatusChip status={item.status} />
          </div>

          <p className="text-muted-foreground relative max-w-3xl text-sm leading-relaxed text-pretty">
            {item.body}
          </p>

          <ul className="relative grid gap-2 sm:grid-cols-2">
            {item.facts.map((fact) => (
              <li key={fact} className="text-foreground/85 flex items-start gap-2 text-sm">
                <CheckCircle2 aria-hidden="true" className="text-brand mt-0.5 size-4 shrink-0" />
                {fact}
              </li>
            ))}
          </ul>
        </BrandCard>
      </Reveal>
    </section>
  );
}

export default function IntegracionesPage() {
  return (
    <div className="w-full">
      <JsonLd data={breadcrumbSchema(["/integraciones"])} />
      <section className="mx-auto w-full max-w-[1100px] px-6 pt-32 pb-14 sm:pt-40">
        <SectionHeading
          as="h1"
          kicker="Conecta lo que ya tienes"
          title="Tu WhatsApp de hoy, funcionando esta semana"
          intro="No hay que montar un canal nuevo ni pedirle permiso a nadie para empezar. Conectas el número que ya usas, cargas tu catálogo y el agente empieza a atender. Cuando el volumen lo justifique, formalizas con la API oficial de Meta sin rehacer nada."
        />
        <div className="mt-9 flex flex-wrap gap-3.5">
          <Button asChild size="lg" className="h-12 px-7 text-base">
            <Link href="/contacto">Agenda tu demo</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
            <a
              href={salesWhatsAppUrl("Hola, quiero saber si Axi Connect funciona con mi WhatsApp actual.")}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              Pregúntanos por WhatsApp
            </a>
          </Button>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1100px] space-y-4 px-6 pb-8">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Canales de conversación
        </h2>
        {CHANNELS.map((channel, index) => (
          <IntegrationBlock key={channel.id} item={channel} index={index} />
        ))}
      </div>

      <div className="mx-auto w-full max-w-[1100px] space-y-4 px-6 pb-16">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Tienda, pagos y voz
        </h2>
        {EXTRAS.map((extra, index) => (
          <IntegrationBlock key={extra.id} item={extra} index={index + 2} />
        ))}
      </div>

      <section className="mx-auto w-full max-w-[1100px] px-6 pb-24">
        <Reveal>
          <div className="border-border bg-card rounded-2xl border p-8 text-center sm:p-10">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              ¿No ves lo que usas?
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-pretty">
              Cuéntanos con qué trabajas y te decimos con franqueza si hoy encaja, si está en
              camino o si no es para ti. Preferimos decírtelo antes de la demo.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-7 text-base">
                <Link href="/contacto">Agenda tu demo</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
                <Link href="/precios">Ver los planes</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
