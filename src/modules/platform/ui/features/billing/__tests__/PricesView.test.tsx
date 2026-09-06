import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PricesView } from "../PricesView";

/**
 * Hallazgo M6 de la auditoría: la publicación es la única verja de que la
 * landing no recibe medio catálogo. Se comprueba el PAYLOAD que sale del panel:
 * componentes (no celdas), vigencia a las 00:00 de Bogotá y la anulación con su
 * motivo.
 */
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));
jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
}));
jest.mock("../PublishPriceSheet", () => ({ PublishPriceSheet: () => null }));

const MARGIN = {
  basis: "measured" as const,
  sample_as_of: "2026-09-06T09:40:00.000Z",
  sample_size: 47_318,
  window_days: 30,
  trm_cop_per_usd: 4200,
  gateway: { provider: "wompi", method: "card" },
  thresholds: { min_list_bps: 7000, min_promo_bps: 6000, bonus_threshold_bps: 7000 },
  promotion_code: null,
  failures: [],
  warnings: [],
  cells: [],
};
// La hoja de publicación corre primero un `dry_run` (verja de margen del borrador) y luego publica.
const publishBatch = jest.fn<Promise<{ ids: string[]; dry_run: boolean; margin: typeof MARGIN }>, [{ dry_run?: boolean }]>((body) =>
  Promise.resolve(
    body.dry_run === true
      ? { ids: [], dry_run: true, margin: MARGIN }
      : { ids: Array.from({ length: 36 }, (_, i) => `p${i}`), dry_run: false, margin: MARGIN },
  ),
);

const queryOf = <T,>(data: T) => ({ data, isPending: false, isError: false, error: null, refetch: jest.fn() });
const plan = (id: string, slug: string, name: string) => ({
  id,
  code: slug,
  name,
  description: null,
  tier: "sbs",
  kind: "package",
  public_slug: slug,
  self_service: true,
  default_limits: [],
  is_active: true,
  subscriptions_count: 0,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
});
const TIER_FEES: Record<string, number> = { t500: 99_900, t1000: 169_900, t2500: 359_900, t5000: 649_900, t10000: 1_149_900, t25000: 2_499_900 };
const tiers = Object.entries(TIER_FEES).map(([code, fee], index) => ({
  id: `tier-${code}`,
  code,
  conversations: Number(code.slice(1)),
  label: Number(code.slice(1)).toLocaleString("es-CO"),
  sort_order: index + 1,
  fee_cents: fee * 100,
  is_active: true,
  price_count: 0,
}));

jest.mock("@/modules/platform/infrastructure/api/hooks/use-margin", () => ({
  useMarginCellsQuery: () =>
    queryOf({
      as_of: "2026-09-06T00:00:00Z",
      basis: "measured",
      sample_size: 47_318,
      window_days: 30,
      cells: [
        {
          plan_code: "esencial",
          plan_id: "p-esencial",
          tier_code: "t500",
          interval: "monthly",
          amount_cents: 18_990_000,
          conversations: 500,
          margin_real_p50: 0.88,
          margin_real_p90: 0.7,
          margin_promo_p50: 0.8,
          status: "ok",
          basis: "measured",
          sample_scope: "global",
          failures: [],
          warnings: [],
        },
      ],
    }),
}));
jest.mock("@/modules/platform/infrastructure/api/hooks/use-plans", () => ({
  usePlansQuery: () =>
    queryOf({
      data: [plan("p-esencial", "esencial", "Esencial"), plan("p-crecimiento", "crecimiento", "Crecimiento"), plan("p-escala", "escala", "Escala")],
    }),
}));
jest.mock("@/modules/platform/infrastructure/api/hooks/use-catalog", () => ({
  useAllBillingPricesQuery: () => queryOf({ data: [] }),
  useVolumeTiersQuery: () => queryOf({ data: tiers }),
  usePromotionsQuery: () => queryOf({ data: [] }),
  usePricingPreviewQuery: () =>
    queryOf({
      as_of: "2026-09-05T00:00:00Z",
      currency: "COP",
      version: "v",
      tiers: [],
      packages: [
        { public_slug: "esencial", name: "Esencial", description: null, package_fee_cents: 9_000_000, capabilities: [], commercial_units: [] },
        { public_slug: "crecimiento", name: "Crecimiento", description: null, package_fee_cents: 20_000_000, capabilities: [], commercial_units: [] },
        { public_slug: "escala", name: "Escala", description: null, package_fee_cents: 40_000_000, capabilities: [], commercial_units: [] },
      ],
      modules: [],
      prices: [],
      promotion: null,
    }),
  usePublishPriceBatch: () => ({ mutateAsync: publishBatch, isPending: false }),
}));

describe("PricesView · publicación por componentes", () => {
  beforeEach(() => publishBatch.mockClear());

  it("deriva 36 celdas de 9 componentes y la verja estructural queda en verde", () => {
    render(<PricesView />);
    expect(screen.getByRole("heading", { name: "Tarifas" })).toBeInTheDocument();
    // Esencial + t500 = 90.000 + 99.900 (Intl es-CO separa con espacio duro)
    expect(screen.getAllByText(/189\.900/).length).toBeGreaterThan(0);
    // Cinco comprobaciones: las cuatro estructurales y el margen real de las celdas vigentes (Tanda C).
    expect(screen.getAllByText("5/5").length).toBeGreaterThan(0);
  });

  it("publica COMPONENTES con la vigencia a las 00:00 de Bogotá y la anulación con su motivo", async () => {
    render(<PricesView />);

    // Anular Escala × 25.000 con motivo.
    fireEvent.click(screen.getAllByTitle("Anular esta celda con motivo").at(-1)!);
    fireEvent.change(screen.getByLabelText(/Precio mensual de la celda/), { target: { value: "2.799.900" } });
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: "Piso de Enterprise" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar en el borrador" }));

    fireEvent.click(screen.getByRole("button", { name: "Publicar vigencia" }));
    fireEvent.change(screen.getByLabelText(/Vigente desde/), { target: { value: "2026-09-15" } });
    // El botón espera a la vista previa (dry_run) de la verja de margen del borrador.
    await waitFor(() => expect(screen.getByText(/La verja de margen pasa/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Publicar 36 celdas/ }));

    // Primera llamada: la vista previa (dry_run) de la verja de margen; la segunda publica.
    await waitFor(() => expect(publishBatch.mock.calls.filter(([body]) => body.dry_run !== true)).toHaveLength(1));
    expect(publishBatch.mock.calls[0]?.[0]).toMatchObject({ dry_run: true });
    const payload = publishBatch.mock.calls.find(([body]) => body.dry_run !== true)?.[0] as unknown as {
      effective_from: string;
      package_fees: { plan_id: string; fee_cents: number }[];
      tier_fees: { code: string; fee_cents: number }[];
      overrides: { plan_id: string; tier_code: string; amount_cents: number; reason: string }[];
    };
    expect(payload.effective_from).toBe("2026-09-15T05:00:00.000Z");
    expect(payload.package_fees).toEqual([
      { plan_id: "p-esencial", fee_cents: 9_000_000 },
      { plan_id: "p-crecimiento", fee_cents: 20_000_000 },
      { plan_id: "p-escala", fee_cents: 40_000_000 },
    ]);
    expect(payload.tier_fees).toHaveLength(6);
    expect(payload.tier_fees[0]).toEqual({ code: "t500", fee_cents: 9_990_000 });
    expect(payload.overrides).toEqual([
      { plan_id: "p-escala", tier_code: "t25000", amount_cents: 279_990_000, reason: "Piso de Enterprise" },
    ]);
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
  });

  it("con la escalera rota la verja bloquea el botón de publicar", () => {
    render(<PricesView />);
    fireEvent.change(screen.getByLabelText("Crecimiento"), { target: { value: "500.000" } });
    expect(screen.getByRole("button", { name: "Publicar vigencia" })).toBeDisabled();
  });
});
