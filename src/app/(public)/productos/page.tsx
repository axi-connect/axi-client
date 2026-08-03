import type { Metadata } from "next";

import { PageOutline, type OutlineSection } from "@/modules/landing/ui/components/PageOutline";

/**
 * `/productos` — lo que el producto ya hace, capacidad por capacidad.
 *
 * ESTADO: andamio provisional. La versión definitiva es la fase F6 del plan de
 * la capa pública (`docs/plans/public-gtm-plan.md`), que se planifica aparte y
 * reutiliza el fondo estrellado del árbol `layout/site/` como identidad visual
 * de esta página.
 *
 * Las anclas de abajo YA están enlazadas desde el dropdown del navbar: si se
 * renombra una, hay que actualizar `SiteHeader.tsx` en el mismo commit.
 */
export const metadata: Metadata = {
  title: "Productos",
  description:
    "El agente vendedor, el inbox con handoff, el CRM, el catálogo con stock real, la agenda y la medición en pesos. Producto construido y en producción, no roadmap.",
  alternates: { canonical: "/productos" },
};

const SECTIONS: readonly OutlineSection[] = [
  {
    id: "agente",
    title: "El agente vendedor",
    description:
      "Se configura, no se programa: instrucciones, personalidad, intención y playbook comercial son datos que editas en el panel. Ejecuta 16 herramientas reales contra tu catálogo, tu agenda y tus medios de pago — y solo carga las que tu negocio puede usar de verdad.",
  },
  {
    id: "inbox",
    title: "Inbox y handoff",
    description:
      "Una sola conversación, dos dimensiones independientes: en qué estado está y quién responde. Tu equipo toma, arrebata o devuelve el control con una nota que el agente lee y aplica — y el cliente nunca repite su historia.",
  },
  {
    id: "crm",
    title: "CRM, leads y contactos",
    description:
      "El pipeline se llena mientras el agente conversa: abre la oportunidad, registra la actividad y programa el seguimiento. El contacto es la misma persona escriba por WhatsApp o por Instagram, con su ciclo de vida y su puntuación explicable.",
  },
  {
    id: "catalogo",
    title: "Catálogo y agenda",
    description:
      "Catálogo de nivel ERP: categorías jerárquicas, variantes con SKU, stock por variante y búsqueda en español que tolera errores de tipeo. Y si lo que vendes es tiempo, la agenda calcula disponibilidad real y manda recordatorios automáticos.",
  },
  {
    id: "medicion",
    title: "Medición en pesos",
    description:
      "Un embudo construido con hechos de tu base de datos —no con opiniones de un modelo— y una evaluación de calidad conversación por conversación. Cuánto vendiste, quién lo vendió y qué corregir primero.",
  },
];

export default function ProductosPage() {
  return (
    <PageOutline
      kicker="Producto construido, en producción"
      title="Todo lo que Axi ya hace por tu negocio"
      intro="No es una promesa de roadmap. Es lo que está funcionando hoy, con negocios reales vendiendo por chat todos los días."
      sections={SECTIONS}
      footerNote="30 minutos. Te mostramos una venta completa —del «hola» al pago verificado— con un negocio como el tuyo."
    />
  );
}
