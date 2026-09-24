import { alertContractViolations, expectAlertContract } from "../testing";

describe("alertContractViolations (§9.4 para los tests de los módulos)", () => {
  it("un aviso bien escrito no tiene faltas", () => {
    expect(
      alertContractViolations({
        tone: "success",
        title: "Cuenta de cobro en camino",
        description:
          "JX-2026-000100 por WhatsApp. Te avisamos aquí si no sale.",
      }),
    ).toEqual([]);
  });

  it("el título largo de antes (dato dentro) cae: es el peor caso real, no «Recibo»", () => {
    const faults = alertContractViolations({
      tone: "success",
      title: "Cuenta de cobro JX-2026-000100 en camino por WhatsApp",
    });
    expect(faults).toEqual([expect.stringMatching(/^título de 5\d > 34/)]);
  });

  it("el mensaje del servidor en el título es falta; en la descripción, no", () => {
    const server = "El recurso ya no existe";
    expect(
      alertContractViolations(
        { tone: "error", title: server },
        { serverMessage: server },
      ),
    ).toEqual([expect.stringMatching(/mensaje del servidor va en el título/)]);
    expect(
      alertContractViolations(
        {
          tone: "error",
          title: "No se pudo abrir el PDF",
          description: server,
        },
        { serverMessage: server },
      ),
    ).toEqual([]);
  });

  it("autoCloseMs es falta salvo que se declare justificado; el punto final y dos botones también", () => {
    expect(
      alertContractViolations({
        tone: "success",
        title: "Listo",
        autoCloseMs: 3000,
      }),
    ).toEqual([expect.stringMatching(/autoCloseMs 3000/)]);
    expect(
      alertContractViolations(
        { tone: "success", title: "Listo", autoCloseMs: 3000 },
        { allowAutoClose: true },
      ),
    ).toEqual([]);
    expect(
      alertContractViolations({ tone: "info", title: "Ya va en camino." }),
    ).toEqual([expect.stringMatching(/punto final/)]);
    expect(
      alertContractViolations({
        tone: "error",
        title: "No se pudo enviar",
        actions: [
          { label: "Ver", onClick: () => undefined },
          { label: "Reintentar", onClick: () => undefined },
        ],
      }),
    ).toEqual(["más de un botón"]);
  });

  it("expectAlertContract lanza con la lista de faltas y pasa en silencio si cumple", () => {
    expect(() =>
      expectAlertContract({ tone: "success", title: "x".repeat(35) }),
    ).toThrow(/no cumple §9\.4/);
    expect(() =>
      expectAlertContract({ tone: "success", title: "Pago registrado" }),
    ).not.toThrow();
  });
});
