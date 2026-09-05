import { render, screen } from "@testing-library/react";
import type { BillingParameter, BillingPromotion, BillingVolumeTier } from "@/modules/platform/domain/billing";
import { ParametersView } from "../ParametersView";
import { PromotionsView } from "../PromotionsView";
import { TiersView } from "../TiersView";

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn(), showModal: jest.fn(), closeModal: jest.fn() }),
}));

jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
}));

const TIERS: BillingVolumeTier[] = [
  { id: "t1", code: "t500", conversations: 500, label: "500", sort_order: 1, fee_cents: 9_990_000, is_active: true, price_count: 6 },
  { id: "t2", code: "t1000", conversations: 1000, label: "1.000", sort_order: 2, fee_cents: 16_990_000, is_active: true, price_count: 6 },
  { id: "t3", code: "t50000", conversations: 50_000, label: "50.000", sort_order: 7, fee_cents: null, is_active: false, price_count: 0 },
];

const PROMO: BillingPromotion = {
  id: "p1",
  code: "founders_2026",
  name: "Programa Fundadores",
  percent_bps: 4000,
  rounding: "floor_900",
  starts_at: "2026-08-04T05:00:00.000Z",
  ends_at: "2027-01-01T05:00:00.000Z",
  max_slots: 20,
  reserved_slots: 3,
  scope: "all",
  stacks_with_annual: true,
  indexation_policy: "ipc_annual",
  indexation_first_year: 2028,
  is_public: true,
  is_active: true,
  counters: { reserved: 1, active: 4, released: 1, expired: 0, taken: 8 },
  redemptions: [
    {
      id: "r1",
      company_id: "c1",
      company_name: "Savage",
      status: "active",
      source: "manual",
      price_id: null,
      indexation_policy: "none",
      reserved_at: "2026-08-04T12:00:00.000Z",
      expires_at: null,
      activated_at: "2026-08-04T12:00:00.000Z",
      released_at: null,
      note: "piloto",
    },
    {
      id: "r2",
      company_id: "c2",
      company_name: "Moda Nube",
      status: "reserved",
      source: "self_service",
      price_id: null,
      indexation_policy: "ipc_annual",
      reserved_at: "2026-09-05T12:00:00.000Z",
      expires_at: "2026-09-12T12:00:00.000Z",
      activated_at: null,
      released_at: null,
      note: null,
    },
  ],
};

const PARAMS: BillingParameter[] = [
  { id: "a", code: "trm_cop_usd", value: 4150, effective_from: "2026-09-05T00:00:00.000Z", effective_to: null, source: "BanRep + colchón", note: null, created_by: "seed", is_current: true },
  { id: "b", code: "trm_cop_usd", value: 4200, effective_from: "2026-09-04T00:00:00.000Z", effective_to: "2026-09-05T00:00:00.000Z", source: "D4", note: null, created_by: "seed", is_current: false },
];

const mutation = { mutateAsync: jest.fn(), isPending: false };
const queryOf = <T,>(data: T) => ({ data, isPending: false, isError: false, error: null, refetch: jest.fn() });

jest.mock("@/modules/platform/infrastructure/api/hooks/use-catalog", () => ({
  useVolumeTiersQuery: () => queryOf({ data: TIERS }),
  useCreateVolumeTier: () => mutation,
  useUpdateVolumeTier: () => mutation,
  usePromotionsQuery: () => queryOf({ data: [PROMO] }),
  useCreatePromotion: () => mutation,
  useUpdatePromotion: () => mutation,
  useClosePromotion: () => mutation,
  useAddManualRedemption: () => mutation,
  useSetRedemptionStatus: () => mutation,
  useBillingParametersQuery: () => queryOf({ data: PARAMS }),
  usePublishParameter: () => mutation,
}));

describe("catálogo de dos ejes · vistas de platform", () => {
  it("Tramos: lista los escalones con su tarifa, el precio por conversación y marca el retirado", () => {
    render(<TiersView />);
    expect(screen.getByRole("heading", { name: "Tramos" })).toBeInTheDocument();
    expect(screen.getByText("t500")).toBeInTheDocument();
    // 99.900 / 500 = 199,8 → $200 por conversación
    expect(screen.getAllByText("$200").length).toBeGreaterThan(0);
    expect(screen.getByText("sin tarifa")).toBeInTheDocument();
    expect(screen.getByText("Retirado")).toBeInTheDocument();
  });

  it("Promociones: el contador suma reservados + reservadas + activas y lista las redenciones con su política", () => {
    render(<PromotionsView />);
    expect(screen.getByRole("heading", { name: "Promociones" })).toBeInTheDocument();
    // 3 reservados a mano + 1 en reserva + 4 activas = 8 de 20
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getAllByText(/de 20/).length).toBeGreaterThan(0);
    expect(screen.getByText("Savage")).toBeInTheDocument();
    expect(screen.getByText("Moda Nube")).toBeInTheDocument();
    // La política va por redención: el piloto queda «Sin ajuste» aunque la promo sea IPC.
    expect(screen.getAllByText("Sin ajuste").length).toBeGreaterThan(0);
    expect(screen.getAllByText("IPC anual").length).toBeGreaterThan(0);
  });

  it("Parámetros: la versión vigente lleva la insignia y la cerrada su rango", () => {
    render(<ParametersView />);
    expect(screen.getByRole("heading", { name: "Parámetros" })).toBeInTheDocument();
    expect(screen.getByText("4.150,00 vigente")).toBeInTheDocument();
    expect(screen.getByText("Cerrada")).toBeInTheDocument();
    expect(screen.getByText("Ningún valor declarado todavía.")).toBeInTheDocument();
  });
});
