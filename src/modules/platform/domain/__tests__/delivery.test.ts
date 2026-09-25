import {
  blockedSteps,
  checkCcEmail,
  createAttemptKeyHolder,
  deliveryIssues,
  formatTrialRange,
  inviteExpiresAt,
  isDispatchedDelivery,
  isoToZonedInput,
  isResumableDelivery,
  latestOwnerAttempt,
  MAX_CC,
  needsConfirmation,
  restartShortensTrial,
  shortMessageId,
  splitCcInput,
  stepOfField,
  summarizeChecks,
  warningFor,
  zonedInputToIso,
} from "../delivery";

const BOGOTA = "America/Bogota";

describe("copia al equipo (checkCcEmail)", () => {
  const owner = "Hola@LaEspiga.co";

  it("acepta un correo válido y lo normaliza", () => {
    expect(checkCcEmail("  Camila@Axi-Connect.co ", { ownerEmail: owner, current: [] })).toEqual({
      ok: true,
      email: "camila@axi-connect.co",
    });
  });

  it("nunca el del dueño, aunque cambien mayúsculas o espacios (N1)", () => {
    const check = checkCcEmail(" hola@laespiga.CO", { ownerEmail: owner, current: [] });
    expect(check).toMatchObject({ ok: false, reason: "owner" });
  });

  it.each(["camila", "camila@", "camila@axi", "cami la@axi.co", "@axi.co"])("rechaza «%s» por formato", (raw) => {
    expect(checkCcEmail(raw, { ownerEmail: owner, current: [] })).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("rechaza el vacío y el duplicado", () => {
    expect(checkCcEmail("  ", { ownerEmail: owner, current: [] })).toMatchObject({ reason: "empty" });
    expect(checkCcEmail("A@x.co", { ownerEmail: owner, current: ["a@x.co"] })).toMatchObject({ reason: "duplicate" });
  });

  it(`admite hasta ${MAX_CC} y ni uno más`, () => {
    const nine = Array.from({ length: MAX_CC - 1 }, (_, i) => `p${i}@x.co`);
    expect(checkCcEmail("diez@x.co", { ownerEmail: null, current: nine }).ok).toBe(true);
    const ten = [...nine, "diez@x.co"];
    expect(checkCcEmail("once@x.co", { ownerEmail: null, current: ten })).toMatchObject({ reason: "too_many" });
  });

  it("parte una lista pegada por comas, punto y coma o espacios", () => {
    expect(splitCcInput("a@x.co, b@x.co;c@x.co\n d@x.co ,")).toEqual(["a@x.co", "b@x.co", "c@x.co", "d@x.co"]);
  });
});

describe("clave de idempotencia (N3)", () => {
  it("se genera una vez por intento y no cambia al reintentar", () => {
    const generate = jest.fn().mockReturnValueOnce("clave-1").mockReturnValueOnce("clave-2");
    const holder = createAttemptKeyHolder(generate);
    expect(holder.peek()).toBeNull();
    expect(holder.current()).toBe("clave-1");
    expect(holder.current()).toBe("clave-1");
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("retoma la clave de una entrega a medias en lugar de generar otra", () => {
    const generate = jest.fn(() => "nueva");
    const holder = createAttemptKeyHolder(generate);
    holder.adopt("clave-de-la-entrega-a-medias");
    expect(holder.current()).toBe("clave-de-la-entrega-a-medias");
    expect(generate).not.toHaveBeenCalled();
  });

  it("por defecto es un UUID (crypto.randomUUID), distinto en cada intento", () => {
    const first = createAttemptKeyHolder();
    const second = createAttemptKeyHolder();
    expect(first.current()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(first.current()).toBe(first.current());
    expect(second.current()).not.toBe(first.current());
  });

  it("a medias = draft o committed; enviada = en cola, enviada o fallida", () => {
    expect(isResumableDelivery({ status: "draft" })).toBe(true);
    expect(isResumableDelivery({ status: "committed" })).toBe(true);
    expect(isResumableDelivery({ status: "sent" })).toBe(false);
    expect(isResumableDelivery(null)).toBe(false);
    expect(isDispatchedDelivery({ status: "mail_queued" })).toBe(true);
    expect(isDispatchedDelivery({ status: "failed" })).toBe(true);
    expect(isDispatchedDelivery({ status: "committed" })).toBe(false);
  });
});

describe("bloqueos y avisos", () => {
  const blockers = [
    { code: "offer_not_quoted", message: "Cotiza la oferta" },
    { code: "payment_methods_missing", message: "Configura un medio de pago" },
    { code: "cc_includes_owner", message: "El dueño no va en copia" },
    { code: "owner_missing", message: "Sin dueño" },
    { code: "codigo_nuevo_del_servidor", message: "Algo nuevo" },
  ];
  const warnings = [{ code: "call_on_weekend", field: "call_day2_at", message: "Cae en fin de semana; revisa si es festivo" }];
  const issues = deliveryIssues("t-1", blockers, warnings);

  it("cada bloqueo va a su grupo y a su paso", () => {
    const byCode = Object.fromEntries(issues.map((issue) => [issue.code, issue]));
    expect(byCode.offer_not_quoted).toMatchObject({ kind: "blocker", group: "offer", step: "offer" });
    expect(byCode.payment_methods_missing).toMatchObject({ group: "kit", step: "review", fix: null });
    expect(byCode.cc_includes_owner).toMatchObject({ group: "mail", step: "mail" });
    expect(byCode.owner_missing.fix).toEqual({ label: "Ver usuarios", href: "/platform/tenants/t-1/users" });
    // Un código que el cliente no conoce no se pierde: cae en «Datos del kit».
    expect(byCode.codigo_nuevo_del_servidor).toMatchObject({ kind: "blocker", group: "kit" });
  });

  it("el aviso de fin de semana apunta a su campo, en «Citas»", () => {
    expect(warningFor(issues, "call_day2_at")).toBe("Cae en fin de semana; revisa si es festivo");
    expect(warningFor(issues, "call_day5_at")).toBeNull();
    expect(issues.find((issue) => issue.kind === "warning")).toMatchObject({ group: "calls", step: "trial" });
  });

  it("la barra: un bloqueo pesa más que un aviso; sin nada, listo", () => {
    const checks = Object.fromEntries(summarizeChecks(issues).map((check) => [check.id, check.state]));
    expect(checks).toEqual({ offer: "blocked", trial: "ok", calls: "warn", mail: "blocked", kit: "blocked" });
    expect(summarizeChecks([]).every((check) => check.state === "ok")).toBe(true);
  });

  it("marca los pasos con un bloqueo, no los que solo tienen avisos", () => {
    expect([...blockedSteps(issues)].sort()).toEqual(["mail", "offer", "review"]);
  });

  it("trial_shortens no bloquea: se confirma al enviar", () => {
    const shortens = deliveryIssues("t-1", [{ code: "trial_shortens", message: "El reinicio acorta la prueba" }], []);
    expect(shortens[0]).toMatchObject({ kind: "confirm", group: "trial" });
    expect(blockedSteps(shortens).size).toBe(0);
    expect(needsConfirmation(shortens)?.code).toBe("trial_shortens");
    expect(summarizeChecks(shortens).find((check) => check.id === "trial")?.state).toBe("warn");
  });

  it.each(["already_paying", "trial_required"])("%s va a «Prueba» y sí bloquea", (code) => {
    const [issue] = deliveryIssues("t-1", [{ code, message: "…" }], []);
    expect(issue).toMatchObject({ kind: "blocker", group: "trial", step: "trial" });
  });

  it("un error de validación del servidor lleva al paso de su campo", () => {
    expect(stepOfField("advisor.whatsapp_e164")).toBe("mail");
    expect(stepOfField("cc.3")).toBe("mail");
    expect(stepOfField("offer.package_code")).toBe("offer");
    expect(stepOfField("call_day5_at")).toBe("trial");
    expect(stepOfField("idempotency_key")).toBe("review");
  });
});

describe("fechas en la zona del tenant", () => {
  it("datetime-local de Bogotá → ISO con offset −05:00, y de vuelta", () => {
    expect(zonedInputToIso("2026-09-28T10:00", BOGOTA)).toBe("2026-09-28T10:00:00-05:00");
    expect(isoToZonedInput("2026-09-28T15:00:00.000Z", BOGOTA)).toBe("2026-09-28T10:00");
  });

  it("respeta el horario de verano de otra zona", () => {
    expect(zonedInputToIso("2026-07-01T09:30", "America/New_York")).toBe("2026-07-01T09:30:00-04:00");
    expect(zonedInputToIso("2026-12-01T09:30", "America/New_York")).toBe("2026-12-01T09:30:00-05:00");
    expect(zonedInputToIso("2026-07-01T09:30", "UTC")).toBe("2026-07-01T09:30:00+00:00");
  });

  it("una fecha a medio escribir es null", () => {
    expect(zonedInputToIso("2026-09-28", BOGOTA)).toBeNull();
    expect(zonedInputToIso("", BOGOTA)).toBeNull();
  });

  it("el rango de la prueba que arranca hoy", () => {
    expect(formatTrialRange("2026-09-24T05:00:00Z", "2026-10-02T04:59:59Z", BOGOTA)).toBe(
      "jue 24 sep → jue 1 oct a las 11:59 p. m.",
    );
  });

  it("el reinicio acorta la prueba solo si la vigente vence después", () => {
    const restartEnds = "2026-10-02T04:59:59Z";
    expect(restartShortensTrial("2026-10-20T04:59:59Z", restartEnds)).toBe(true);
    expect(restartShortensTrial("2026-09-26T04:59:59Z", restartEnds)).toBe(false);
    expect(restartShortensTrial(null, restartEnds)).toBe(false);
  });
});

describe("entrega enviada", () => {
  const attempts = [
    { attempt: 1, audience: "owner" as const, status: "sent", provider_message_id: "re_1", sent_at: "2026-09-24T22:40:00Z" },
    { attempt: 1, audience: "team" as const, status: "sent", provider_message_id: "re_t", sent_at: "2026-09-24T22:40:01Z" },
    { attempt: 2, audience: "owner" as const, status: "sent", provider_message_id: "re_8f2c9a77b", sent_at: "2026-09-25T13:00:00Z" },
  ];

  it("el último envío al dueño es el que vale para el enlace", () => {
    expect(latestOwnerAttempt(attempts)?.provider_message_id).toBe("re_8f2c9a77b");
    expect(inviteExpiresAt(attempts)).toBe("2026-09-28T13:00:00.000Z");
    expect(inviteExpiresAt([])).toBeNull();
  });

  it("acorta el id del mensaje para la ficha", () => {
    expect(shortMessageId("re_8f2c9a77b")).toBe("re_8f2c9…");
    expect(shortMessageId("re_1")).toBe("re_1");
  });
});
