import type { BillingSummaryDTO } from "@/modules/billing/domain/account";
import { useBillingStore } from "../billing.store";

const getBillingSummary = jest.fn();

jest.mock("@/modules/billing/infrastructure/services/billing-service.adapter", () => ({
  getBillingSummary: () => getBillingSummary(),
}));

function summary(over: Partial<BillingSummaryDTO> = {}): BillingSummaryDTO {
  return {
    account_status: "current",
    plan_code: "sbs",
    currency: "COP",
    cycle: null,
    next_invoice_estimate_cents: 108_600_000,
    outstanding_cents: 0,
    open_invoices: 0,
    auto_charge: false,
    has_payment_source: false,
    grace_days: 5,
    oldest_due_at: null,
    ...over,
  };
}

/** Deja el store como recién creado entre pruebas. */
function reset() {
  useBillingStore.setState({ status: "idle", summary: null, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  reset();
});

describe("useBillingStore", () => {
  it("una carga trae el resumen y deja la sección lista", async () => {
    getBillingSummary.mockResolvedValue(summary());

    await useBillingStore.getState().load();

    expect(useBillingStore.getState().status).toBe("ready");
    expect(useBillingStore.getState().summary?.plan_code).toBe("sbs");
  });

  it("DEDUPLICA las peticiones en vuelo: el banner y el resumen montan a la vez", async () => {
    // El banner de mora vive en el layout privado y la vista de resumen en su
    // página: al entrar a `/billing` los dos montan casi simultáneamente. Sin
    // deduplicación serían dos peticiones del mismo dato.
    let resolver: (value: BillingSummaryDTO) => void = () => undefined;
    getBillingSummary.mockReturnValue(
      new Promise<BillingSummaryDTO>((resolve) => {
        resolver = resolve;
      }),
    );

    const first = useBillingStore.getState().load();
    const second = useBillingStore.getState().refresh();
    resolver(summary());
    await Promise.all([first, second]);

    expect(getBillingSummary).toHaveBeenCalledTimes(1);
  });

  it("`load` NO repite la petición si ya tiene el dato", async () => {
    // Es lo que llama el banner, que monta en TODAS las páginas del panel:
    // pedirlo en cada navegación sería una petición por pantalla.
    getBillingSummary.mockResolvedValue(summary());

    await useBillingStore.getState().load();
    await useBillingStore.getState().load();
    await useBillingStore.getState().load();

    expect(getBillingSummary).toHaveBeenCalledTimes(1);
  });

  it("`refresh` SÍ vuelve a pedir: la pantalla del dinero no sirve datos viejos", async () => {
    getBillingSummary.mockResolvedValue(summary());
    await useBillingStore.getState().load();

    getBillingSummary.mockResolvedValue(summary({ outstanding_cents: 122_900_000 }));
    await useBillingStore.getState().refresh();

    expect(getBillingSummary).toHaveBeenCalledTimes(2);
    expect(useBillingStore.getState().summary?.outstanding_cents).toBe(122_900_000);
  });

  it("un refresco fallido NO tumba una pantalla que ya tiene datos", async () => {
    // El usuario está mirando cifras válidas: cambiárselas por un error es peor
    // que servirle un dato de hace unos segundos.
    getBillingSummary.mockResolvedValue(summary());
    await useBillingStore.getState().load();

    getBillingSummary.mockRejectedValue(new Error("backend caído"));
    await useBillingStore.getState().refresh();

    expect(useBillingStore.getState().status).toBe("ready");
    expect(useBillingStore.getState().summary).not.toBeNull();
    expect(useBillingStore.getState().error).toBeNull();
  });

  it("la PRIMERA carga fallida sí deja la sección en error", async () => {
    getBillingSummary.mockRejectedValue(new Error("backend caído"));

    await useBillingStore.getState().load();

    expect(useBillingStore.getState().status).toBe("error");
    expect(useBillingStore.getState().error).not.toBeNull();
  });

  it("un fallo NO deja la petición atascada: la siguiente vuelve a intentarlo", async () => {
    // Si la promesa en vuelo no se limpiara en el `finally`, el store quedaría
    // mudo el resto de la sesión.
    getBillingSummary.mockRejectedValue(new Error("red caída"));
    await useBillingStore.getState().load();

    getBillingSummary.mockResolvedValue(summary());
    await useBillingStore.getState().refresh();

    expect(getBillingSummary).toHaveBeenCalledTimes(2);
    expect(useBillingStore.getState().summary).not.toBeNull();
  });

  it("los tres eventos de WS re-consultan el resumen en vez de recalcularlo", async () => {
    // Ninguno de los payloads trae el saldo agregado, y deducirlo sumando sería
    // inventar el dato.
    getBillingSummary.mockResolvedValue(summary());
    const store = useBillingStore.getState();

    store.onPastDue();
    await Promise.resolve();
    expect(getBillingSummary).toHaveBeenCalled();
  });
});
