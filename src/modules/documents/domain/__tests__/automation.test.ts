import {
  automationStory,
  type AutomationDraft,
} from "@/modules/documents/domain/automation";

const OFF: AutomationDraft = {
  contract_issue: "never",
  receipt_on_payment_verified: false,
  send_contract_whatsapp: false,
  send_contract_email: false,
  send_receipt_whatsapp: false,
  send_receipt_email: false,
  hsm_name: "",
};
const NUMBERS = { contract: "CTR-2026-0121", receipt: "REC-2026-0020" };

describe("automationStory («Lo que sale solo»)", () => {
  it("todo apagado: nada sale solo y los dos pasos lo dicen como huecos", () => {
    const story = automationStory(OFF, NUMBERS);
    expect(story.summary).toBe(
      "Con esto no sale nada solo: todo lo emites y lo envías tú.",
    );
    expect(story.steps.map((step) => step.issues)).toEqual([false, false]);
    expect(story.whatsappGap).toBe(false);
  });

  it("el contrato sale al momento elegido con su número, y se dice por dónde se envía", () => {
    const onConfirm = automationStory(
      { ...OFF, contract_issue: "on_confirm", send_contract_email: true },
      NUMBERS,
    );
    expect(onConfirm.steps[0]).toMatchObject({
      issues: true,
      when: "Al confirmar la reserva",
      what: "Sale el contrato CTR-2026-0121",
      how: "Y se le envía por correo, si tiene correo en su ficha.",
    });
    expect(onConfirm.summary).toBe(
      "Un papel sale solo y le llega sin que nadie lo mande.",
    );
    const onDeposit = automationStory(
      { ...OFF, contract_issue: "on_deposit_verified" },
      NUMBERS,
    );
    expect(onDeposit.steps[0]).toMatchObject({
      when: "Al verificar el anticipo",
      how: "Queda en el pedido: nadie lo envía solo.",
    });
    expect(onDeposit.summary).toBe(
      "Un papel sale solo, pero ninguno se envía solo.",
    );
  });

  it("los interruptores de envío de un papel que NO sale solo no cuentan (el envío automático solo aplica a lo emitido solo)", () => {
    const story = automationStory(
      {
        ...OFF,
        receipt_on_payment_verified: true,
        send_receipt_email: true,
        send_contract_whatsapp: true,
      },
      NUMBERS,
    );
    expect(story.steps[0]?.issues).toBe(false);
    expect(story.summary).toBe(
      "Un papel sale solo y le llega sin que nadie lo mande.",
    );
    // WhatsApp del contrato encendido, pero el contrato no sale solo: no hay hueco.
    expect(story.whatsappGap).toBe(false);
  });

  it("WhatsApp para algo que sale solo sin plantilla de respaldo deja el hueco; con plantilla, no", () => {
    const draft: AutomationDraft = {
      ...OFF,
      contract_issue: "on_confirm",
      receipt_on_payment_verified: true,
      send_contract_whatsapp: true,
      send_receipt_email: true,
    };
    expect(automationStory(draft, NUMBERS).whatsappGap).toBe(true);
    expect(
      automationStory({ ...draft, hsm_name: "documento_listo" }, NUMBERS)
        .whatsappGap,
    ).toBe(false);
    expect(automationStory(draft, NUMBERS).summary).toBe(
      "Los dos papeles salen solos y le llegan sin que nadie los mande.",
    );
    expect(
      automationStory({ ...draft, send_receipt_email: false }, NUMBERS).summary,
    ).toBe("Los dos papeles salen solos; uno le llega sin que nadie lo mande.");
  });
});
