import {
  artifactAction,
  briefingDayLabel,
  expiryLabel,
  isActionable,
  isUrgent,
  proposalKindLabel,
  proposalSourceLabel,
  proposalStatusLabel,
} from "../proposal-labels";
import { readArtifacts } from "../cmo";

/**
 * Estas funciones deciden qué botón se pinta y con qué urgencia, así que sus
 * errores no son cosméticos: ofrecer "Aprobar" en un hallazgo produce un 409 del
 * backend, y pintar todo como urgente hace que nada lo parezca.
 */

describe("proposalKindLabel", () => {
  it("traduce los tipos conocidos al vocabulario del dueño", () => {
    expect(proposalKindLabel("campaign")).toBe("Campaña");
    expect(proposalKindLabel("agent_tuning")).toBe("Cómo vende tu agente");
  });

  it("un tipo nuevo del backend se muestra CRUDO, no como 'Otro'", () => {
    // Esconderlo detrás de una etiqueta genérica haría que el bug tarde semanas
    // en aparecer; verlo en pantalla lo delata el primer día.
    expect(proposalKindLabel("kind_del_futuro")).toBe("kind_del_futuro");
  });
});

describe("proposalStatusLabel", () => {
  it("habla como una persona, no como un enum", () => {
    expect(proposalStatusLabel("expired")).toBe("Venció sin decidir");
    expect(proposalStatusLabel("pending")).toBe("Por decidir");
  });

  it("un estado desconocido se muestra crudo", () => {
    expect(proposalStatusLabel("archivada")).toBe("archivada");
  });
});

describe("isActionable", () => {
  it("un hallazgo NO se aprueba: no hay nada que encender", () => {
    expect(isActionable("insight")).toBe(false);
  });

  it("todo lo demás sí", () => {
    for (const kind of ["campaign", "recovery", "repurchase", "agent_tuning"]) {
      expect(isActionable(kind)).toBe(true);
    }
  });
});

/**
 * Las fechas se construyen con el constructor LOCAL y no con cadenas UTC.
 * `expiryLabel` razona en días de calendario locales (es lo que el dueño ve), y
 * un test escrito con `"...T01:00:00Z"` pasaría o fallaría según la zona del
 * runner — en Bogotá esa hora todavía es el día anterior.
 */
const at = (year: number, month: number, day: number, hour: number): Date =>
  new Date(year, month - 1, day, hour, 0, 0, 0);

describe("expiryLabel", () => {
  const now = at(2026, 8, 20, 12);

  it("sin vencimiento no dice nada (la UI no pinta un hueco)", () => {
    expect(expiryLabel(null, now)).toBeNull();
  });

  it("hoy es hoy: el mismo día de calendario, no 'en 24 horas'", () => {
    expect(expiryLabel(at(2026, 8, 20, 23).toISOString(), now)).toBe("Vence hoy");
  });

  it("mañana es mañana, sea a las 11 de la mañana o a las 6 de la tarde", () => {
    // Las dos caen en el día siguiente. Contar horas partidas por 24 llamaría
    // "en 2 días" a la segunda (30 h), que es falso y además choca con cómo el
    // dueño ya lo tiene en la cabeza.
    expect(expiryLabel(at(2026, 8, 21, 11).toISOString(), now)).toBe("Vence mañana");
    expect(expiryLabel(at(2026, 8, 21, 18).toISOString(), now)).toBe("Vence mañana");
  });

  it("la palabra dice el día; el COLOR dice la urgencia", () => {
    // A la 1 de la madrugada de mañana faltan 13 horas: la etiqueta dice
    // "mañana" (es verdad) y `isUrgent` es quien lo pinta en ámbar.
    const earlyTomorrow = at(2026, 8, 21, 1).toISOString();
    expect(expiryLabel(earlyTomorrow, now)).toBe("Vence mañana");
    expect(isUrgent(earlyTomorrow, now)).toBe(true);
  });

  it("más allá, en días", () => {
    expect(expiryLabel(at(2026, 8, 25, 12).toISOString(), now)).toBe("Vence en 5 días");
  });

  it("pasado el plazo lo dice en pasado", () => {
    expect(expiryLabel(at(2026, 8, 19, 12).toISOString(), now)).toBe("Venció");
  });

  it("una fecha basura no rompe la tarjeta", () => {
    expect(expiryLabel("no-es-fecha", now)).toBeNull();
  });
});

describe("isUrgent", () => {
  const now = at(2026, 8, 20, 12);

  it("dentro de 48 horas merece el color de alarma", () => {
    expect(isUrgent(at(2026, 8, 21, 12).toISOString(), now)).toBe(true);
  });

  it("más allá NO: si todo urge, nada urge", () => {
    expect(isUrgent(at(2026, 8, 25, 12).toISOString(), now)).toBe(false);
  });

  it("sin fecha no urge", () => {
    expect(isUrgent(null, now)).toBe(false);
  });
});

describe("artifactAction", () => {
  it("dice exactamente qué pasa con cada cosa al aprobar", () => {
    expect(artifactAction("campaign")).toContain("lanza");
    expect(artifactAction("automation")).toContain("enciende");
    expect(artifactAction("agent_playbook")).toContain("reversible");
  });

  it("plantillas y segmentos no se encienden: son material", () => {
    expect(artifactAction("template")).toContain("apagado");
    expect(artifactAction("segment")).toContain("apagado");
  });
});

describe("readArtifacts", () => {
  it("normaliza lo que el servidor escribe", () => {
    expect(
      readArtifacts([
        { type: "campaign", id: "camp-1", label: "Amor y Amistad", before: null, after: null },
      ]),
    ).toEqual([
      { type: "campaign", id: "camp-1", label: "Amor y Amistad", before: null, after: null },
    ]);
  });

  it("descarta un tipo que todavía no se sabe pintar, sin romper la pantalla", () => {
    const result = readArtifacts([
      { type: "tipo_del_futuro", id: "x", label: "raro" },
      { type: "promotion", id: "p", label: "15%" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("promotion");
  });

  it("tolera basura: null, strings y objetos sin forma", () => {
    expect(readArtifacts([null, "texto", 42, {}])).toEqual([]);
  });

  it("conserva el antes/después del guion: es el material del rollback", () => {
    const result = readArtifacts([
      {
        type: "agent_playbook",
        id: "pb-1",
        label: "Guion",
        before: "Avisa cuando llegue.",
        after: "Ofrece dos alternativas.",
      },
    ]);
    expect(result[0]?.before).toBe("Avisa cuando llegue.");
    expect(result[0]?.after).toBe("Ofrece dos alternativas.");
  });

  it("un label ausente no deja la fila en blanco", () => {
    expect(readArtifacts([{ type: "promotion", id: "p" }])[0]?.label).toBe("Sin nombre");
  });
});

describe("proposalSourceLabel", () => {
  it("distingue lo que Axel trajo solo de lo que le pidieron", () => {
    // Es el sello de la tarjeta dentro del hilo: sin él, una propuesta que
    // apareció sola parece la respuesta a algo que el dueño nunca preguntó.
    expect(proposalSourceLabel("briefing")).toBe("Del informe del día");
    expect(proposalSourceLabel("signal")).toBe("Lo vi y te avisé");
    expect(proposalSourceLabel("chat")).toBe("De lo que me pediste");
  });

  it("un origen nuevo del backend se muestra crudo", () => {
    expect(proposalSourceLabel("cron_del_futuro")).toBe("cron_del_futuro");
  });
});

describe("briefingDayLabel", () => {
  it("formatea el día local del negocio", () => {
    expect(briefingDayLabel("2026-08-21")).toBe("21 de agosto");
  });

  it("NO interpreta la fecha como UTC: el 1 del mes no se convierte en el 31 anterior", () => {
    // `new Date("2026-08-01")` es medianoche UTC, que en Bogotá (UTC-5) cae el
    // 31 de julio. De ahí que la cadena se parta a mano en vez de pasarla al
    // constructor: el briefing es de un DÍA local, no de un instante.
    expect(briefingDayLabel("2026-08-01")).toBe("1 de agosto");
  });

  it("una fecha ilegible se devuelve tal cual en vez de pintar 'Invalid Date'", () => {
    expect(briefingDayLabel("ayer")).toBe("ayer");
    expect(briefingDayLabel("2026-08")).toBe("2026-08");
  });
});
