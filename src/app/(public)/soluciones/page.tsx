import type { Metadata } from "next";

import { PageOutline, type OutlineSection } from "@/modules/landing/ui/components/PageOutline";

/**
 * `/soluciones` — los cuatro trabajos que Axi hace, no las funciones que tiene.
 *
 * ESTADO: andamio provisional. La versión definitiva es la fase F5 del plan de
 * la capa pública (`docs/plans/public-gtm-plan.md`), que se planifica aparte.
 *
 * Las anclas de abajo YA están enlazadas desde el dropdown del navbar: si se
 * renombra una, hay que actualizar `SiteHeader.tsx` en el mismo commit.
 */
export const metadata: Metadata = {
  title: "Soluciones",
  description:
    "Califica leads, cierra ventas dentro del chat, retén clientes y programa citas sobre disponibilidad real. El mismo producto, cuatro formas de usarlo.",
  alternates: { canonical: "/soluciones" },
};

const SECTIONS: readonly OutlineSection[] = [
  {
    id: "califica",
    title: "Califica leads sin perseguir a nadie",
    description:
      "El agente responde en segundos a cualquier hora, captura los datos que tu negocio necesita y abre la oportunidad en el pipeline sin que nadie la digite. El que escribe a las 9 de la noche deja de ser un mensaje sin leer.",
  },
  {
    id: "cierra",
    title: "Cierra ventas dentro de la conversación",
    description:
      "Cotiza con los precios de tu catálogo, confirma el pedido con número consecutivo, descuenta inventario y comparte tus medios de pago. La venta ocurre en el chat: sin sacar al cliente a un carrito web.",
  },
  {
    id: "retiene",
    title: "Retiene clientes y recupera lo que se enfrió",
    description:
      "El contacto es uno solo entre canales, con su historial completo y su ciclo de vida. Y como el embudo mide el abandono, sabes exactamente qué conversaciones se cayeron y en qué punto.",
  },
  {
    id: "agenda",
    title: "Programa reuniones y citas",
    description:
      "Disponibilidad calculada desde el horario de tu negocio, la duración del servicio y tu zona horaria. El agente reserva sin duplicar, y el sistema recuerda la cita 24 horas y 1 hora antes por el mismo canal.",
  },
];

export default function SolucionesPage() {
  return (
    <PageOutline
      kicker="Cuatro trabajos, un solo producto"
      title="Lo que Axi hace por ti, según lo que necesites resolver"
      intro="No hay desarrollo a medida: un restaurante, una tienda de ropa y un estudio de grabación usan el mismo software con configuración distinta."
      sections={SECTIONS}
      footerNote="En la demo lo vemos con tu tipo de negocio y estimamos contigo el volumen que manejas."
    />
  );
}
