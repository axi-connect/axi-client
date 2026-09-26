/**
 * «Lo que sale solo» (Cobros premium P8): los ajustes de emisión y envío
 * automáticos contados como lo que le pasa a UNA reserva, de principio a fin.
 * Puro: la isla de la pestaña Automáticos lo pinta con el BORRADOR del
 * formulario, así que cambia mientras se mueven los interruptores.
 *
 * Refleja las reglas del motor (F9): el contrato sale al confirmar o al
 * verificar el anticipo; el recibo, con cada pago verificado; el envío
 * automático solo aplica a lo que salió solo; por WhatsApp, fuera de las 24 h
 * solo sale con una plantilla de respaldo.
 */
/**
 * Cuándo sale el contrato solo. Tres opciones EXCLUYENTES aunque el wire lleve
 * dos booleanos: encender los dos sería emitir el mismo contrato dos veces (la
 * idempotencia lo dedupe, pero es ruido).
 */
export const CONTRACT_ISSUE_OPTIONS = [
  "never",
  "on_confirm",
  "on_deposit_verified",
] as const;
export type ContractIssue = (typeof CONTRACT_ISSUE_OPTIONS)[number];

export interface AutomationDraft {
  contract_issue: ContractIssue;
  receipt_on_payment_verified: boolean;
  send_contract_whatsapp: boolean;
  send_contract_email: boolean;
  send_receipt_whatsapp: boolean;
  send_receipt_email: boolean;
  hsm_name: string;
}

export interface AutomationStep {
  key: "contract" | "receipt";
  /** Sale un papel (se pinta su papelito) o no sale nada (hueco punteado). */
  issues: boolean;
  when: string;
  what: string;
  how: string;
}

export interface AutomationStory {
  summary: string;
  steps: AutomationStep[];
  /** WhatsApp encendido para algo que sale solo, sin plantilla de respaldo. */
  whatsappGap: boolean;
}

function ways(whatsapp: boolean, email: boolean): string | null {
  if (whatsapp && email)
    return "por WhatsApp y, si tiene correo en su ficha, por correo";
  if (whatsapp) return "por WhatsApp";
  if (email) return "por correo, si tiene correo en su ficha";
  return null;
}

export function automationStory(
  draft: AutomationDraft,
  numbers: { contract: string; receipt: string },
): AutomationStory {
  const contractIssues = draft.contract_issue !== "never";
  const receiptIssues = draft.receipt_on_payment_verified;
  const contractWays = ways(
    draft.send_contract_whatsapp,
    draft.send_contract_email,
  );
  const receiptWays = ways(
    draft.send_receipt_whatsapp,
    draft.send_receipt_email,
  );

  const steps: AutomationStep[] = [
    contractIssues
      ? {
          key: "contract",
          issues: true,
          when:
            draft.contract_issue === "on_confirm"
              ? "Al confirmar la reserva"
              : "Al verificar el anticipo",
          what: `Sale el contrato ${numbers.contract}`,
          how:
            contractWays === null
              ? "Queda en el pedido: nadie lo envía solo."
              : `Y se le envía ${contractWays}.`,
        }
      : {
          key: "contract",
          issues: false,
          when: "Al confirmar la reserva",
          what: "No sale ningún contrato solo",
          how: "Lo emites tú desde el pedido, cuando quieras.",
        },
    receiptIssues
      ? {
          key: "receipt",
          issues: true,
          when: "Con cada pago verificado",
          what: `Sale un recibo; el próximo, ${numbers.receipt}`,
          how:
            receiptWays === null
              ? "Queda en el pedido: nadie lo envía solo."
              : `Y se le envía ${receiptWays}.`,
        }
      : {
          key: "receipt",
          issues: false,
          when: "Con cada pago verificado",
          what: "No sale ningún recibo solo",
          how: "El pago queda registrado; el papel lo emites tú si hace falta.",
        },
  ];

  const papers = (contractIssues ? 1 : 0) + (receiptIssues ? 1 : 0);
  const sent =
    (contractIssues && contractWays !== null ? 1 : 0) +
    (receiptIssues && receiptWays !== null ? 1 : 0);
  const summary =
    papers === 0
      ? "Con esto no sale nada solo: todo lo emites y lo envías tú."
      : sent === 0
        ? `${papers === 1 ? "Un papel sale solo" : "Los dos papeles salen solos"}, pero ninguno se envía solo.`
        : sent === papers
          ? papers === 1
            ? "Un papel sale solo y le llega sin que nadie lo mande."
            : "Los dos papeles salen solos y le llegan sin que nadie los mande."
          : "Los dos papeles salen solos; uno le llega sin que nadie lo mande.";

  const whatsappGap =
    draft.hsm_name.trim() === "" &&
    ((contractIssues && draft.send_contract_whatsapp) ||
      (receiptIssues && draft.send_receipt_whatsapp));

  return { summary, steps, whatsappGap };
}
