import { buildKitView } from "../kit-view";
import type { WelcomeKitData } from "../welcome-kit";

const DATA: WelcomeKitData = {
  businessName: "Panadería La Espiga",
  ownerFirstName: "Andrés",
  agentName: "Sofía",
  agentTone: "Cercano y claro",
  teamHours: "7:00 a. m. – 7:00 p. m.",
  loginEmail: "hola@laespiga.co",
  panelUrl: "https://app.axi-connect.co",
  paymentMethods: ["tarjeta", "nequi", "pse"],
  catalog: { fileName: "catalogo-la-espiga.xlsx", fileSizeBytes: 1258291, productCount: 48 },
  advisor: { fullName: "Camila Restrepo", whatsappE164: "+573004821937", digestTime: "07:30" },
  trial: { startDate: "2026-09-29", conversations: 75 },
  plan: { name: "Small Business Suite", monthlyPriceCop: 150000, listPriceCop: 250000, conversationsPerMonth: 1000 },
};

describe("buildKitView", () => {
  const view = buildKitView(DATA);

  it("arma la fila de la bienvenida y el conector con el nombre del agente", () => {
    expect(view.trialRange).toBe("29 sep → 6 oct");
    expect(view.agentConnector).toBe("ASÍ TRABAJA SOFÍA");
    expect(view.advisorFirstName).toBe("Camila");
  });

  it("pinta los cuatro medios de pago, encendidos solo los del tenant y en orden fijo", () => {
    expect(view.payments.map((p) => [p.label, p.on])).toEqual([
      ["Nequi", true],
      ["PSE", true],
      ["Tarjeta", true],
      ["Contra entrega", false],
    ]);
  });

  it("la tabla del plan dice el día 7 con su condición y los medios en una frase", () => {
    expect(view.planRows).toEqual([
      { k: "Primer cobro", v: "6 oct 2026, si decides seguir" },
      { k: "Pagas con", v: "Nequi, PSE o Tarjeta" },
      { k: "Enlace de pago", v: "Te llega el día 5" },
      { k: "Tarjeta para empezar", v: "No hace falta" },
      { k: "IVA", v: "No aplica: pagas lo que ves" },
    ]);
    expect(view.priceFmt).toBe("$ 150.000");
    expect(view.listPriceFmt).toBe("$ 250.000");
    expect(view.planConversations).toBe("1.000");
  });

  it("la semana tiene ocho días, con el nombre del agente y un conector menos", () => {
    expect(view.days).toHaveLength(8);
    expect(view.days[0]).toMatchObject({ n: "0", node: "now", hasLine: true, lineStyle: "lead" });
    expect(view.days[0].body).toBe("Sofía queda atendiendo, creas tu contraseña y recibes este kit.");
    expect(view.days[2]).toMatchObject({ node: "meet", tag: "llamada · 10 min", lineStyle: "dotted" });
    expect(view.days[6].body).toBe("Te cuento lo que vendió Sofía en la semana.");
    expect(view.days[7]).toMatchObject({ node: "end", tag: "tu decisión", hasLine: false });
  });

  it("formatea la hora del resumen, el panel y el WhatsApp del asesor", () => {
    expect(view.digestTime).toBe("7:30 a. m.");
    expect(view.digestTimeUpper).toBe("7:30 A. M.");
    expect(view.panelUrl).toBe("app.axi-connect.co");
    expect(view.panelHref).toBe("https://app.axi-connect.co");
    expect(view.advisorPhone).toBe("+57 300 482 1937");
    expect(view.advisorWaHref).toBe("https://wa.me/573004821937");
  });

  it("no pinta huecos cuando faltan datos opcionales", () => {
    const partial = buildKitView({
      ...DATA,
      agentTone: null,
      teamHours: null,
      catalog: { fileName: null, fileSizeBytes: null, productCount: 0 },
    });
    expect(partial.agentTone).toBe("—");
    expect(partial.teamHours).toBe("—");
    expect(partial.catalogFile).toBe("Tu catálogo");
    expect(partial.catalogSize).toBe("");
    expect(partial.catalogCount).toBe("0");
  });
});
