import {
  lastReminderLine,
  manualStageOf,
  previewSegments,
  relativeDay,
  reminderKeyLabel,
  reminderThread,
  renderReminderPreview,
  skipReasonLabel,
  unknownReminderVariables,
} from "@/modules/collections/domain/reminder";

/**
 * El dominio de los recordatorios (F5 Cobros).
 *
 * Lo que más se prueba aquí es lo que NO salió: que la cartera pueda decir «no
 * salió» con su razón y en otro tono es lo que cambia lo que el operador hace a
 * continuación, y es justo lo que una pantalla descuidada aplana a «omitido».
 */
describe("lastReminderLine", () => {
  const now = new Date("2026-09-18T15:00:00Z");

  it("sin avisos lo dice, y no finge que hubo uno", () => {
    expect(lastReminderLine(null, now)).toEqual({
      text: "Sin avisos todavía",
      tone: "muted",
    });
  });

  it("un aviso que NO salió se lee distinto y trae su razón", () => {
    const line = lastReminderLine(
      {
        at: "2026-09-16T13:00:00Z",
        status: "skipped",
        channel: "whatsapp",
        skip_reason: "outside_service_window_no_hsm",
      },
      now,
    );

    // El tono es lo que hace que se vea sin leer: un «no salió» perdido entre
    // los «entregado» es exactamente lo que no queremos.
    expect(line.tone).toBe("warning");
    expect(line.text).toContain("No salió hace 2 días");
    expect(line.text).toContain("sin plantilla aprobada");
  });

  it("uno entregado es contexto, no alarma", () => {
    const line = lastReminderLine(
      {
        at: "2026-09-17T13:00:00Z",
        status: "delivered",
        channel: "whatsapp",
        skip_reason: null,
      },
      now,
    );

    expect(line).toEqual({ text: "Avisado ayer · entregado", tone: "muted" });
  });

  it("un fallo del proveedor también avisa al operador", () => {
    expect(
      lastReminderLine(
        {
          at: "2026-09-18T11:00:00Z",
          status: "failed",
          channel: "email",
          skip_reason: null,
        },
        now,
      ),
    ).toEqual({ text: "El aviso falló hoy", tone: "warning" });
  });
});

describe("relativeDay", () => {
  it("cuenta DÍAS del calendario, no múltiplos de 24 horas", () => {
    // Un aviso de anoche a las 23:00 es «ayer» aunque hayan pasado nueve horas.
    // Decir «hoy» de algo que el operador recuerda de ayer le hace dudar de la
    // pantalla entera.
    const now = new Date("2026-09-18T08:00:00");
    expect(
      relativeDay(new Date("2026-09-17T23:00:00").toISOString(), now),
    ).toBe("ayer");
    expect(
      relativeDay(new Date("2026-09-18T01:00:00").toISOString(), now),
    ).toBe("hoy");
  });

  it("una fecha ilegible no rompe la fila", () => {
    expect(relativeDay("no soy una fecha")).toBe("");
  });
});

describe("unknownReminderVariables", () => {
  it("QA F5: un nombre con punto o guion también es un hueco inventado; una válida con espacios, no", () => {
    expect(
      unknownReminderVariables(
        "Hola {{cliente.mascota}} y {{ contact_name }}, {{cliente-nombre}}",
        ["contact_name", "amount"],
      ),
    ).toEqual(["cliente.mascota", "cliente-nombre"]);
    expect(
      unknownReminderVariables("{{ amount }} y {{amount}}", ["amount"]),
    ).toEqual([]);
  });

  // La lista la manda el SERVIDOR: es lo que hace que esta comprobación siga
  // siendo cierta cuando el renderizador cambie. Un espejo copiado a mano
  // bloquearía plantillas válidas o dejaría pasar huecos sin rellenar.
  const delServidor = ["contact_name", "amount", "installments_count"];

  it("caza la que el servidor no sabe rellenar", () => {
    // Sin esto, `{{descuento}}` sale TAL CUAL en el WhatsApp de un cliente.
    expect(
      unknownReminderVariables(
        "Hola {{contact_name}}, te doy {{descuento}}",
        delServidor,
      ),
    ).toEqual(["descuento"]);
  });

  it("no se queja de las que sí existen", () => {
    expect(
      unknownReminderVariables(
        "{{amount}} de {{installments_count}}",
        delServidor,
      ),
    ).toEqual([]);
  });

  it("una variable NUEVA del servidor deja de ser un error aquí", () => {
    // La deriva que más duele de un espejo copiado: el servidor aprende a
    // rellenar algo, el dueño lo escribe, y la pantalla le bloquea el guardado
    // de una plantilla perfectamente válida.
    expect(
      unknownReminderVariables("Te quedan {{cupos_restantes}}", [
        ...delServidor,
        "cupos_restantes",
      ]),
    ).toEqual([]);
  });
});

describe("renderReminderPreview", () => {
  it("rellena con las cifras del ejemplo", () => {
    expect(renderReminderPreview("Debes {{amount}} de {{balance}}")).toBe(
      "Debes $ 3.797.500 de $ 7.595.000",
    );
  });

  it("una variable desconocida se queda LITERAL, para que se vea antes de enviar", () => {
    expect(renderReminderPreview("Hola {{nombre_raro}}")).toBe(
      "Hola {{nombre_raro}}",
    );
  });

  it("un hueco vacío no deja la coma huérfana", () => {
    // Espejo del servidor: sus plantillas empiezan por «Hola {{contact_name}}, »
    // y un contacto sin nombre dejaba «Hola , hoy vence…».
    expect(
      renderReminderPreview("Hola {{contact_name}}, te esperamos.", {
        contact_name: "",
      }),
    ).toBe("Hola, te esperamos.");
  });
});

describe("reminderKeyLabel", () => {
  it("traduce la clave con el desfase dentro", () => {
    expect(reminderKeyLabel("due_soon_7")).toBe("7 días antes");
    expect(reminderKeyLabel("overdue_1")).toBe("1 día de mora");
    expect(reminderKeyLabel("due_today")).toBe("El día del vencimiento");
    expect(reminderKeyLabel("manual")).toBe("Enviado a mano");
  });

  it("una clave que no reconoce se muestra cruda, no se esconde", () => {
    expect(reminderKeyLabel("algo_nuevo")).toBe("algo_nuevo");
  });
});

describe("skipReasonLabel", () => {
  it("dice la razón en español", () => {
    expect(skipReasonLabel("template_disabled")).toBe("El texto está apagado");
  });

  it("una razón que no conoce sale CRUDA y no como «omitido»", () => {
    // Prefiero que el operador vea un código feo a que la pantalla le esconda
    // el motivo: eso es justo la mudez que esta fase vino a quitar.
    expect(skipReasonLabel("razon_nueva_del_servidor")).toBe(
      "razon_nueva_del_servidor",
    );
  });
});

describe("manualStageOf", () => {
  it("una cuota que aún no vence NO usa el texto de mora", () => {
    // Decirle «tienes una cuota pendiente desde el 22» a alguien cuya fecha no
    // ha llegado se lee como un cobro agresivo, y es un error de programa.
    expect(manualStageOf("2026-09-22", new Date("2026-09-18T10:00:00"))).toBe(
      "due_soon",
    );
  });

  it("el día del vencimiento tiene su propio texto", () => {
    expect(manualStageOf("2026-09-18", new Date("2026-09-18T10:00:00"))).toBe(
      "due_today",
    );
  });

  it("una cuota vencida sí", () => {
    expect(manualStageOf("2026-09-15", new Date("2026-09-18T10:00:00"))).toBe(
      "overdue",
    );
  });
});

describe("reminderThread (premium P5: la cadencia como conversación)", () => {
  const templates = {
    due_soon: { enabled: true, body: "a" },
    due_today: { enabled: true, body: "b" },
    overdue: { enabled: true, body: "c" },
  };
  const hsm = { name: "cobro", language: "es" };
  const base = {
    reminder_days_before: [3, 7, 0],
    overdue_reminder_days: [7, 1],
    templates,
    hsm_templates: { due_soon: hsm, due_today: hsm, overdue: hsm },
    reminder_channels: { whatsapp: true, email: false },
  };

  it("ordena como llegarían y elige el texto de cada día, como el servidor", () => {
    const { entries, maxMessages } = reminderThread(base, "2026-10-16");
    expect(entries.map((one) => [one.id, one.template])).toEqual([
      ["due_soon_7", "due_soon"],
      ["due_soon_3", "due_soon"],
      ["due_today", "due_today"],
      ["overdue_1", "overdue"],
      ["overdue_7", "overdue"],
    ]);
    expect(entries[0].when).toMatch(/vie 9 de oct · 7 días antes$/);
    expect(entries[3].when).toMatch(/17 de oct · 1 día de mora$/);
    expect(maxMessages).toBe(5);
  });

  it("M1: con el día 0 en las dos cadencias sale UNO (due_today); sin él en la de antes, el 0 de después es mora", () => {
    const both = reminderThread({
      ...base,
      reminder_days_before: [0],
      overdue_reminder_days: [0],
    });
    expect(both.entries.map((one) => one.id)).toEqual(["due_today"]);
    expect(both.maxMessages).toBe(1);
    const onlyAfter = reminderThread({
      ...base,
      reminder_days_before: [3],
      overdue_reminder_days: [0],
    });
    expect(onlyAfter.entries.map((one) => [one.id, one.template])).toEqual([
      ["due_soon_3", "due_soon"],
      ["overdue_0", "overdue"],
    ]);
  });

  it("un texto apagado no cuenta y no pide plantilla", () => {
    const off = reminderThread({
      ...base,
      templates: { ...templates, due_soon: { enabled: false, body: "a" } },
    });
    expect(
      off.entries.filter((one) => one.disabled).map((one) => one.id),
    ).toEqual(["due_soon_7", "due_soon_3"]);
    expect(
      off.entries.some((one) => one.disabled && one.whatsappNeedsHsm),
    ).toBe(false);
    expect(off.maxMessages).toBe(3);
  });

  it("M2: la plantilla aprobada se busca para CADA texto y solo importa si WhatsApp está encendido", () => {
    const partial = reminderThread({
      ...base,
      hsm_templates: { overdue: hsm },
    });
    expect(
      partial.entries
        .filter((one) => one.whatsappNeedsHsm)
        .map((one) => one.id),
    ).toEqual(["due_soon_7", "due_soon_3", "due_today"]);
    expect(partial.maxMessages).toBe(5);
    const emailOnly = reminderThread({
      ...base,
      hsm_templates: {},
      reminder_channels: { whatsapp: false, email: true },
    });
    expect(emailOnly.entries.some((one) => one.whatsappNeedsHsm)).toBe(false);
  });
});

describe("previewSegments", () => {
  it("marca solo la variable que el servidor no conoce", () => {
    expect(
      previewSegments("Hola {{contact_name}}, {{descuento}}", ["contact_name"]),
    ).toEqual([
      { text: "Hola Laura Gómez, ", unknown: false },
      { text: "{{descuento}}", unknown: true },
    ]);
  });
});
