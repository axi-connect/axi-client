"use client";

import { useCallback } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";

import {
  demoteDecisionMaker,
  discardLead,
} from "../../infrastructure/services/prospecting-service.adapter";

/**
 * Qué se sabe de la persona, que decide qué se puede decir de ella:
 * - `registry`: sale del registro mercantil. Existe y es del negocio.
 * - `member_confirmed`: alguien del equipo confirmó que trabaja aquí.
 * - `open`: lo demás (una pista del sitio, una persona de Apollo, una sin
 *   procedencia): puede no trabajar aquí o no decidir.
 */
export type NotThemStanding = "registry" | "member_confirmed" | "open";

/** De quién se está diciendo «No es». */
export interface NotThemSubject {
  id: string;
  name: string;
  /** Figura hoy como quien decide (o aprueba). */
  decides: boolean;
  standing: NotThemStanding;
}

/**
 * La situación de quien decide, por su FUENTE REAL. «Registro mercantil» solo
 * se dice de quien trajo el registro (`provider === "rues"`): un hecho de otra
 * fuente (Apollo) también llega con `confirmed_by: "source"`, y atribuirle el
 * registro era falso.
 */
export function notThemStanding(person: {
  provider: string | null;
  confirmed_by: "source" | "person" | null;
  /** Alguien del EQUIPO confirmó que trabaja aquí (no la fuente). */
  member_confirmed: boolean;
}): NotThemStanding {
  if (person.provider === "rues" && person.confirmed_by === "source") return "registry";
  if (person.member_confirmed) return "member_confirmed";
  return "open";
}

/**
 * «No es», preguntado antes de hacer nada.
 *
 * Con un solo toque borraba a la persona del negocio, también a un
 * representante legal del registro. Ahora se pregunta QUÉ no es, con una frase
 * y botones de rótulo humano (sin menú numerado):
 *
 * - de un hecho del registro, o de alguien que el equipo confirmó que trabaja
 *   aquí, solo cabe «No es quien decide»: la persona se queda y deja de
 *   figurar como quien decide;
 * - de una pista que figura como quien decide: «No trabaja aquí» (se quita) o
 *   «No es quien decide» (se queda);
 * - de una persona dudosa sin ese papel: «No trabaja aquí», con su confirmación.
 *
 * Las acciones cierran el diálogo al pulsarlas (comportamiento por defecto del
 * modal); el resultado se avisa aparte.
 */
export function useNotThem(onDone: () => void) {
  const { showAlert, showModal } = useAlert();

  const run = useCallback(
    async (action: "remove" | "demote", subject: NotThemSubject) => {
      try {
        if (action === "remove") {
          await discardLead(subject.id, "No trabaja en este negocio");
          showAlert({ tone: "success", title: `${subject.name} ya no aparece en este negocio` });
        } else {
          await demoteDecisionMaker(subject.id);
          showAlert({
            tone: "success",
            title: `${subject.name} ya no figura como quien decide`,
            description: "Sigue entre las personas del negocio.",
          });
        }
        onDone();
      } catch (caught) {
        showAlert({
          tone: "error",
          title: "No se pudo guardar el cambio",
          description: errorMessage(caught, "Intenta de nuevo."),
        });
      }
    },
    [onDone, showAlert],
  );

  return useCallback(
    (subject: NotThemSubject) => {
      const cancel = { label: "Cancelar", variant: "outline" as const, asClose: true };
      const demote = { label: "No es quien decide", onClick: () => void run("demote", subject) };
      const remove = { label: "No trabaja aquí", onClick: () => void run("remove", subject) };

      if (subject.standing === "registry") {
        showModal({
          title: `¿${subject.name} no es quien decide?`,
          description:
            "Sale del registro mercantil, así que sigue entre las personas del negocio. Solo deja de aparecer como quien decide, también en el contacto de tu CRM.",
          actions: [cancel, demote],
        });
        return;
      }
      if (subject.standing === "member_confirmed" && subject.decides) {
        showModal({
          title: `¿${subject.name} no es quien decide?`,
          description:
            "Tu equipo confirmó que trabaja aquí, así que sigue entre las personas del negocio. Solo deja de aparecer como quien decide.",
          actions: [cancel, demote],
        });
        return;
      }
      if (subject.decides) {
        showModal({
          title: "¿No trabaja aquí, o no es quien decide?",
          description: `Si ${subject.name} no trabaja aquí, la quitamos de este negocio. Si trabaja aquí pero no decide, se queda entre las personas.`,
          actions: [cancel, { ...remove, variant: "outline" as const }, demote],
        });
        return;
      }
      showModal({
        title: `¿${subject.name} no trabaja aquí?`,
        description: "La quitamos de las personas de este negocio.",
        actions: [cancel, remove],
      });
    },
    [run, showModal],
  );
}
