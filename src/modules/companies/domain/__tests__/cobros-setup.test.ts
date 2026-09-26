import {
  featureSetup,
  setupSummary,
  type CollectionsSetupDTO,
  type DocumentsSetupDTO,
  type FxSetupDTO,
  type SetupSources,
} from "@/modules/companies/domain/cobros-setup";

const collections = (
  overrides: Partial<CollectionsSetupDTO> = {},
): CollectionsSetupDTO =>
  ({
    deposit_pct: 30,
    installments_strategy: "custom_count",
    installments_count: 1,
    final_due_days_before_service: 30,
    reminder_days_before: [7, 1],
    overdue_reminder_days: [1],
    reminder_channels: { whatsapp: true, email: false },
    templates: {
      due_soon: { enabled: true, body: "" },
      due_today: { enabled: true, body: "" },
      overdue: { enabled: true, body: "" },
    },
    ...overrides,
  }) as unknown as CollectionsSetupDTO;

const fx = (overrides: Partial<FxSetupDTO> = {}): FxSetupDTO =>
  ({
    settlement_currency: "COP",
    spread_bps: 150,
    manual_rate: null,
    show_indicative_quotes: true,
    ...overrides,
  }) as FxSetupDTO;

const docs = (legal: string | null): DocumentsSetupDTO =>
  ({ issuer: { legal_name: legal } }) as unknown as DocumentsSetupDTO;

const all = (over: Partial<SetupSources> = {}): SetupSources => ({
  collections: collections(),
  fx: fx(),
  documents: docs("Juanito Expediciones S.A.S."),
  ...over,
});

describe("puesta en marcha de cobros", () => {
  it("recordatorios: con cadencia, texto y canal está lista; sin días NO lo está y lo dice", () => {
    expect(featureSetup("collections", all())).toMatchObject({
      configured: true,
      foot: "3 avisos por cuota como mucho",
    });
    expect(
      featureSetup(
        "collections",
        all({
          collections: collections({
            reminder_days_before: [],
            overdue_reminder_days: [],
          }),
        }),
      ),
    ).toMatchObject({
      configured: false,
      foot: "Los recordatorios aún no tienen cadencia",
      linkLabel: "Configurar",
    });
  });

  it("recordatorios: con días pero todos los textos apagados, o sin canal, tampoco está lista", () => {
    const off = { enabled: false, body: "" };
    expect(
      featureSetup(
        "collections",
        all({
          collections: collections({
            templates: { due_soon: off, due_today: off, overdue: off },
          } as Partial<CollectionsSetupDTO>),
        }),
      ),
    ).toMatchObject({
      configured: false,
      foot: "Todos los textos están apagados",
    });
    expect(
      featureSetup(
        "collections",
        all({
          collections: collections({
            reminder_channels: { whatsapp: false, email: false },
          } as Partial<CollectionsSetupDTO>),
        }),
      ),
    ).toMatchObject({ configured: false, foot: "No hay canal para enviarlos" });
  });

  it("documentos: con razón social está lista; sin ella (o en blanco) falta el emisor", () => {
    expect(featureSetup("documents", all())).toMatchObject({
      configured: true,
      foot: "Emite Juanito Expediciones S.A.S.",
    });
    expect(
      featureSetup("documents", all({ documents: docs("  ") })),
    ).toMatchObject({ configured: false });
    expect(
      featureSetup("documents", all({ documents: docs(null) })),
    ).toMatchObject({
      configured: false,
      foot: "Falta la razón social del emisor",
    });
  });

  it("plan de pagos y moneda resumen lo que hay; una lectura que falló no se cuenta ni como lista ni como faltante", () => {
    // Una cuota en singular: «1 cuotas» fue el hallazgo R3-05 de los contratos
    expect(featureSetup("payment_plans", all()).foot).toBe(
      "Anticipo 30 % · 1 cuota y saldo 30 días antes",
    );
    expect(
      featureSetup(
        "payment_plans",
        all({ collections: collections({ installments_count: 2 }) }),
      ).foot,
    ).toBe("Anticipo 30 % · 2 cuotas y saldo 30 días antes");
    expect(featureSetup("fx_quotes", all()).foot).toBe(
      "Cobras en COP · TRM + 1,5 %",
    );
    expect(
      featureSetup(
        "fx_quotes",
        all({
          fx: fx({
            manual_rate: { rate: 3950, valid_until: "2026-09-30" },
          } as Partial<FxSetupDTO>),
        }),
      ).foot,
    ).toBe("Cobras en COP · tasa manual");
    expect(featureSetup("fx_quotes", all({ fx: "error" }))).toMatchObject({
      configured: null,
    });
  });

  it("el resumen cuenta solo las encendidas, y la primera que falta es la que nombra la isla", () => {
    const sources = all({
      collections: collections({
        reminder_days_before: [],
        overdue_reminder_days: [],
      }),
    });
    const summary = setupSummary(
      ["payment_plans", "collections", "fx_quotes", "documents"],
      sources,
    );
    expect(summary.ready).toBe(3);
    expect(summary.next?.missing).toBe("Faltan los recordatorios");
    // Apagada la cobranza, ya no falta nada: la isla no inventa pendientes
    const without = setupSummary(
      ["payment_plans", "fx_quotes", "documents"],
      sources,
    );
    expect(without).toMatchObject({ ready: 3, next: null });
    expect(setupSummary([], sources)).toMatchObject({
      steps: [],
      ready: 0,
      next: null,
    });
  });
});
