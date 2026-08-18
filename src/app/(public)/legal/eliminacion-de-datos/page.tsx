import type { Metadata } from "next";

import {
  LegalDocument,
  type LegalSection,
} from "@/modules/landing/ui/components/LegalDocument";

/**
 * Instrucciones de eliminación de datos.
 *
 * Existe por un requisito concreto de Meta: el App Review exige una URL de
 * instrucciones de borrado —o un callback firmado— y este es el camino que la
 * documentación admite sin escribir un endpoint. La URL va en *Configuración →
 * Básica → Instrucciones de eliminación de datos*, NO en el campo de «URL de
 * solicitud de eliminación» del Login, que espera un `signed_request` y
 * rechazaría una página.
 *
 * La política de privacidad ya reconoce el derecho, pero en prosa y sin pasos
 * concretos: Meta pide qué se borra, cómo se pide y en cuánto se responde.
 *
 * ⚠️ REQUIERE REVISIÓN LEGAL ANTES DE PUBLICAR, igual que las otras dos.
 * Los plazos deben coincidir con los de `legal/privacidad`.
 */
export const metadata: Metadata = {
  title: "Cómo eliminar tus datos",
  description:
    "Pasos para solicitar la eliminación de los datos que Axi Connect trata, qué se borra, qué se conserva por obligación legal y en cuánto tiempo respondemos.",
  alternates: { canonical: "/legal/eliminacion-de-datos" },
};

const SECTIONS: readonly LegalSection[] = [
  {
    heading: "A quién aplica cada caso",
    body: [
      "Hay dos situaciones distintas y conviene no confundirlas, porque el camino es diferente.",
      [
        "Eres una empresa cliente de Axi Connect: tus datos y los de tus conversaciones están bajo tu cuenta, y puedes pedir que los eliminemos por completo.",
        "Escribiste por WhatsApp, Instagram o Messenger a una empresa que usa Axi Connect: nosotros tratamos ese mensaje por encargo de esa empresa, que es quien decide sobre él. Puedes escribirnos igualmente y trasladamos tu solicitud, pero la decisión final es suya.",
      ],
    ],
  },
  {
    heading: "Cómo solicitarlo",
    body: [
      "Escríbenos a soporte@axi-connect.co desde el correo asociado a tu cuenta, o por el canal de contacto de la página, con el asunto «Eliminación de datos».",
      "Para poder atenderla necesitamos identificar de qué cuenta se trata. Si escribes desde otro correo, te pediremos alguna forma de verificar que la solicitud es tuya: no borramos datos a petición de un tercero sin comprobarlo.",
      "No hace falta que expliques el motivo.",
    ],
  },
  {
    heading: "Qué se elimina",
    body: [
      "Al confirmar la solicitud eliminamos:",
      [
        "Tu cuenta de usuario y los datos de la empresa asociada.",
        "Las conversaciones y los mensajes recibidos y enviados por tus canales conectados, junto con los archivos adjuntos.",
        "Los contactos, sus fichas y su historial en el CRM.",
        "Las credenciales de los canales conectados, que además se revocan ante Meta para que dejemos de recibir tus mensajes.",
      ],
    ],
  },
  {
    heading: "Qué se conserva, y por qué",
    body: [
      "Hay información que no podemos borrar de inmediato porque una obligación legal o contractual nos exige conservarla: los comprobantes de facturación y los registros contables asociados a los pagos, durante el plazo que fija la normativa colombiana.",
      "Esos registros no incluyen el contenido de tus conversaciones. Cuando vence el plazo, se eliminan también.",
    ],
  },
  {
    heading: "En cuánto respondemos",
    body: [
      "Confirmamos la recepción en un plazo de dos días hábiles e informamos del resultado en un máximo de quince días hábiles, conforme a la Ley 1581 de 2012.",
      "Si necesitamos más tiempo por el volumen de la solicitud, te lo comunicamos antes de que venza ese plazo, explicando el motivo y la nueva fecha.",
    ],
  },
  {
    heading: "Desconectar sin borrar",
    body: [
      "Si lo que quieres es dejar de recibir mensajes sin perder el historial, no hace falta eliminar nada: desde Ajustes → Canales puedes desconectar cualquier canal. Deja de recibir y de enviar al instante, conservas las conversaciones y la configuración, y puedes volver a conectarlo cuando quieras.",
    ],
  },
];

export default function DataDeletionPage() {
  return (
    <LegalDocument
      title="Cómo eliminar tus datos"
      updatedAt="18 de agosto de 2026"
      intro="Esta página explica cómo pedir la eliminación de los datos que tratamos, qué se borra exactamente, qué estamos obligados a conservar y en cuánto tiempo respondemos."
      sections={SECTIONS}
    />
  );
}
