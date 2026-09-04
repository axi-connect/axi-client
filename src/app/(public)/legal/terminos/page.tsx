import type { Metadata } from "next";

import { pageMetadata } from "@/core/seo/metadata";
import { JsonLd } from "@/core/seo/json-ld";
import { breadcrumbSchema } from "@/core/seo/site";

import {
  LegalDocument,
  type LegalSection,
} from "@/modules/landing/ui/components/LegalDocument";

/**
 * Términos y condiciones del servicio.
 *
 * ⚠️ REQUIERE REVISIÓN LEGAL ANTES DE PUBLICAR. El contenido describe con
 * fidelidad cómo opera el producto (alta asistida, límites de consumo con
 * degradación de la IA, verificación de Meta del número, verificación humana del
 * pago), pero no ha pasado por un abogado.
 *
 * Fuente de los hechos descritos: `docs/business/knowledge-base.md` §9, §15.
 */
export const metadata: Metadata = pageMetadata({
  title: "Términos y condiciones",
  description:
    "Condiciones de uso del servicio de Axi Connect: alta de cuentas, planes y límites de consumo, canales de mensajería, responsabilidades y vigencia.",
  path: "/legal/terminos",
});

const SECTIONS: readonly LegalSection[] = [
  {
    heading: "Objeto",
    body: [
      "Estas condiciones regulan el uso de Axi Connect, una plataforma de atención y venta conversacional que permite a una empresa atender a sus clientes por canales de mensajería con agentes de inteligencia artificial y con su propio equipo humano.",
      "Al usar la plataforma, la empresa cliente acepta estas condiciones.",
    ],
  },
  {
    heading: "Alta de cuentas",
    body: [
      "El alta de empresas es asistida: no existe registro automático. Las cuentas las crea el equipo de Axi Connect a solicitud del cliente, y cada empresa administra desde su panel los usuarios, roles y permisos de su equipo.",
      "El cliente es responsable de la confidencialidad de las credenciales de sus usuarios y de las acciones que se realicen con ellas.",
    ],
  },
  {
    heading: "Planes, consumo y límites",
    body: [
      "El servicio se presta por suscripción. Cada plan define un volumen de uso y unos límites por métrica de consumo.",
      "Al alcanzar el límite de consumo de inteligencia artificial, el comportamiento por defecto es degradar, no bloquear: se pausa el agente de IA y el equipo humano del cliente conserva el acceso completo al inbox y a todas las conversaciones. Avisamos al 80 % y al 100 % del consumo del período.",
      "Los excedentes y las condiciones de facturación se acuerdan con cada cliente antes de la activación.",
    ],
  },
  {
    heading: "Canales de mensajería",
    body: [
      "La plataforma opera exclusivamente sobre los canales oficiales de Meta (WhatsApp Cloud API, Instagram Direct, Messenger). Esto implica dos condiciones que el cliente acepta expresamente:",
      [
        "Los canales están sujetos a las políticas y tarifas de Meta, incluida la ventana de servicio de 24 horas y el costo por plantilla entregada, y a su disponibilidad.",
        "El alta de un canal exige que Meta verifique el negocio y el número del cliente. Ese trámite lo resuelve Meta con sus propios tiempos y criterios, y su resultado es ajeno a Axi Connect.",
      ],
    ],
  },
  {
    heading: "Alcance de los agentes de inteligencia artificial",
    body: [
      "Los agentes operan sobre los datos que el cliente configura: su catálogo, sus precios, su agenda y su política comercial. Los precios y totales los calcula el servidor a partir de esos datos, nunca el modelo de lenguaje.",
      "La confirmación de un pago recibido requiere siempre la verificación de una persona del equipo del cliente: el agente registra el comprobante que envía el consumidor, pero no da el pago por recibido.",
      "El cliente es responsable de la exactitud de la información que carga en la plataforma y de la política comercial que configura para sus agentes.",
    ],
  },
  {
    heading: "Propiedad de los datos y confidencialidad",
    body: [
      "Los datos que el cliente y sus consumidores generan en la plataforma son del cliente. Axi Connect los trata para prestar el servicio y no los usa para entrenar modelos de inteligencia artificial.",
      "El aislamiento entre empresas es estructural: ninguna empresa puede acceder a los datos de otra. Las operaciones internas que requieren saltarse ese aislamiento exigen privilegios de plataforma y quedan registradas en auditoría con su motivo.",
    ],
  },
  {
    heading: "Disponibilidad y suspensión",
    body: [
      "Trabajamos para mantener el servicio disponible de forma continua, con las salvedades propias de mantenimientos programados y de la disponibilidad de los canales de terceros.",
      "El incumplimiento de las condiciones de pago acordadas puede dar lugar a la suspensión del servicio. La suspensión no destruye información: los mensajes entrantes quedan retenidos y se reprocesan al reactivar la cuenta.",
    ],
  },
  {
    heading: "Uso aceptable",
    body: [
      "El cliente se compromete a no usar la plataforma para enviar comunicaciones no solicitadas, suplantar identidades, comercializar productos o servicios ilícitos, ni vulnerar las políticas de los canales de mensajería que conecta.",
    ],
  },
  {
    heading: "Modificaciones y vigencia",
    body: [
      "Podemos actualizar estas condiciones. Los cambios sustanciales se comunican a los clientes activos con antelación razonable por los canales habituales, y la fecha del encabezado refleja la última versión.",
    ],
  },
  {
    heading: "Ley aplicable",
    body: [
      "Estas condiciones se rigen por la legislación de la República de Colombia.",
    ],
  },
];

export default function TerminosPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(["/legal/terminos"])} />
      <LegalDocument
        title="Términos y condiciones"
        updatedAt="3 de agosto de 2026"
        intro="Estas condiciones describen cómo se presta el servicio de Axi Connect y qué puede esperar cada parte. Están escritas para entenderse sin abogado."
        sections={SECTIONS}
      />
    </>
  );
}
