import type { Metadata } from "next";

import {
  LegalDocument,
  type LegalSection,
} from "@/modules/landing/ui/components/LegalDocument";

/**
 * Política de privacidad.
 *
 * ⚠️ REQUIERE REVISIÓN LEGAL ANTES DE PUBLICAR. El contenido describe lo que el
 * producto hace de verdad (aislamiento multi-tenant, retención de datos, qué se
 * captura en el formulario de demo), pero no ha pasado por un abogado. En
 * Colombia aplica la Ley 1581 de 2012 y el Decreto 1377 de 2013, que exigen
 * identificar al responsable, la finalidad del tratamiento y el canal para
 * ejercer los derechos del titular.
 *
 * Los datos de retención salen de `docs/business/knowledge-base.md` §15.5.
 */
export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo Axi Connect trata los datos personales: qué recogemos, para qué, cuánto tiempo los conservamos y cómo ejercer tus derechos.",
  alternates: { canonical: "/legal/privacidad" },
};

const SECTIONS: readonly LegalSection[] = [
  {
    heading: "Quién es el responsable",
    body: [
      "Axi Connect es el responsable del tratamiento de los datos personales recogidos a través de este sitio y de la plataforma. Para cualquier asunto relacionado con tus datos puedes escribirnos por los canales de la página de contacto.",
    ],
  },
  {
    heading: "Qué datos recogemos en este sitio",
    body: [
      "Cuando solicitas una demostración a través del formulario, recogemos únicamente los datos que tú escribes:",
      [
        "Tu nombre.",
        "El nombre de tu negocio.",
        "Tu número de WhatsApp.",
        "El rango aproximado de conversaciones mensuales que manejas.",
      ],
      "No pedimos documentos de identidad, datos financieros ni información sensible para agendar una demostración.",
    ],
  },
  {
    heading: "Para qué usamos esos datos",
    body: [
      "Exclusivamente para contactarte y coordinar la demostración que solicitaste, y para entender qué plan corresponde al volumen de tu negocio. No vendemos ni cedemos tus datos a terceros con fines publicitarios.",
      "Si decides no continuar, puedes pedirnos que eliminemos tu registro y lo haremos.",
    ],
  },
  {
    heading: "Datos de tus clientes dentro de la plataforma",
    body: [
      "Cuando tu empresa usa Axi Connect, los datos de tus propios clientes (conversaciones, contactos, pedidos) son tuyos: nosotros los tratamos como encargados, siguiendo tus instrucciones.",
      "El aislamiento entre empresas es estructural, no una política de conducta: toda consulta a la base de datos exige el contexto de la empresa y falla si no lo recibe. En el plan Enterprise, tu empresa opera además sobre una base de datos dedicada.",
      "No usamos el contenido de tus conversaciones para entrenar modelos de inteligencia artificial.",
    ],
  },
  {
    heading: "Cuánto tiempo conservamos los datos",
    body: [
      "Los plazos de retención de la plataforma son:",
      [
        "Eventos de consumo: 13 meses.",
        "Registros de auditoría: 12 meses.",
        "Métricas técnicas de los turnos del agente de IA: 6 meses.",
      ],
      "Los datos de contacto comercial recogidos en este sitio se conservan mientras exista una relación o interés comercial vigente, y se eliminan cuando lo solicitas.",
    ],
  },
  {
    heading: "Tus derechos",
    body: [
      "Como titular de tus datos personales puedes conocer, actualizar y rectificar la información que tenemos sobre ti, solicitar prueba de la autorización que nos diste, revocar esa autorización y pedir la supresión de tus datos cuando no exista un deber legal o contractual que nos obligue a conservarlos.",
      "Para ejercer cualquiera de estos derechos, escríbenos por los canales de la página de contacto. Respondemos en los plazos que fija la normativa colombiana.",
    ],
  },
  {
    heading: "Cookies y medición",
    body: [
      "Este sitio usa el almacenamiento local del navegador únicamente para recordar tu preferencia de tema (claro u oscuro). La sesión de la plataforma se mantiene con cookies técnicas necesarias para autenticarte, marcadas como HttpOnly: no son accesibles desde JavaScript.",
    ],
  },
  {
    heading: "Cambios en esta política",
    body: [
      "Si modificamos esta política, actualizaremos la fecha del encabezado. Los cambios sustanciales se comunican a los clientes activos por los canales habituales.",
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <LegalDocument
      title="Política de privacidad"
      updatedAt="3 de agosto de 2026"
      intro="Este documento explica qué datos personales recogemos, con qué finalidad, cuánto tiempo los conservamos y cómo puedes ejercer tus derechos sobre ellos."
      sections={SECTIONS}
    />
  );
}
