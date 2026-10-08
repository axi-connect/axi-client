import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { StorageSummaryDTO } from "@/modules/storage/domain/storage";

const mockGetSummary = jest.fn<Promise<StorageSummaryDTO>, []>();
jest.mock("@/modules/storage/infrastructure/services/storage-service.adapter", () => ({
  getStorageSummary: () => mockGetSummary(),
}));
const mockAuth = { status: "authenticated", hasPermission: jest.fn<boolean, [string]>(() => true) };
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => mockAuth }));

import { StorageView } from "../StorageView";
import { useStorageStore } from "@/modules/storage/infrastructure/stores/storage.store";

const GIB = 1024 ** 3;

function summary(overrides: Partial<StorageSummaryDTO> = {}): StorageSummaryDTO {
  return {
    company_id: "c1",
    name: "Clínica Dermalux",
    plan_name: "Crecimiento",
    used_bytes: 12.6 * GIB,
    quota_bytes: 15 * GIB,
    quota_source: "plan",
    grace_pct: 5,
    pct_used: 84,
    state: "warning",
    blocks_uploads: false,
    by_category: [
      { category: "inbound_media", origin: "customer", bytes: 8.1 * GIB, objects: 10 },
      { category: "catalog_image", origin: "team", bytes: 3 * GIB, objects: 10 },
      { category: "call_recording", origin: "system", bytes: 1.5 * GIB, objects: 10 },
    ],
    growth: {
      per_month_bytes: 0.8 * GIB,
      days_to_full: 90,
      series: [
        { day: "2026-04-10", bytes: 7.8 * GIB },
        { day: "2026-10-08", bytes: 12.6 * GIB },
      ],
      window_days: 180,
    },
    measured_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("StorageView (Mi empresa › Almacenamiento)", () => {
  beforeEach(() => {
    useStorageStore.getState().reset();
    mockGetSummary.mockReset();
    mockAuth.hasPermission.mockImplementation(() => true);
  });

  it("cerca del límite: lo que queda, el medidor, los tres orígenes, el ritmo y «Hablar con soporte»", async () => {
    mockGetSummary.mockResolvedValue(summary());
    render(<StorageView />);
    expect(await screen.findByText("2,4")).toBeInTheDocument();
    expect(screen.getByText("GB libres de 15 GB")).toBeInTheDocument();
    expect(screen.getByText("Cerca del límite")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Espacio usado" })).toHaveAttribute("aria-valuenow", "84");
    expect(screen.getByText("Lo que te envían tus clientes")).toBeInTheDocument();
    expect(screen.getByText("Lo que sube tu equipo")).toBeInTheDocument();
    expect(screen.getByText("Lo que genera Axi")).toBeInTheDocument();
    expect(screen.getByText(/Llegas al tope hacia/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hablar con soporte/ })).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(screen.queryByText("Tu equipo no puede subir archivos.")).toBeNull();
  });

  it("lleno: la banda informativa con soporte, y sin la ficha de «¿Necesitas más espacio?»", async () => {
    mockGetSummary.mockResolvedValue(summary({ state: "full", used_bytes: 15 * GIB, pct_used: 100, blocks_uploads: true }));
    render(<StorageView />);
    expect(await screen.findByText("Tu equipo no puede subir archivos.")).toBeInTheDocument();
    expect(screen.getByText("Lleno")).toBeInTheDocument();
    expect(screen.getByText("Llegaste al tope")).toBeInTheDocument();
    expect(screen.queryByText("¿Necesitas más espacio?")).toBeNull();
    expect(screen.getAllByRole("link", { name: /Hablar con soporte/ })).toHaveLength(1);
  });

  it("sin cuota: lo ocupado, sin medidor ni ritmo", async () => {
    mockGetSummary.mockResolvedValue(summary({ state: "unlimited", quota_bytes: null, quota_source: "none", pct_used: null, used_bytes: 3.4 * GIB }));
    render(<StorageView />);
    expect(await screen.findByText("GB ocupados")).toBeInTheDocument();
    expect(screen.getByText("Sin cuota")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText("Tu ritmo")).toBeNull();
    expect(screen.getByText("Qué sigue funcionando")).toBeInTheDocument();
  });

  it("error al leer: lo dice (nunca un cero) y reintenta", async () => {
    mockGetSummary.mockRejectedValueOnce(new Error("Falló la red"));
    render(<StorageView />);
    expect(await screen.findByText("No pudimos leer tu espacio")).toBeInTheDocument();
    mockGetSummary.mockResolvedValue(summary());
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));
    await waitFor(() => expect(screen.getByText("2,4")).toBeInTheDocument());
  });

  it("sin storage:read no pide el resumen y explica quién lo ve", () => {
    mockAuth.hasPermission.mockImplementation(() => false);
    render(<StorageView />);
    expect(screen.getByText(/lo ven quienes la administran/)).toBeInTheDocument();
    expect(mockGetSummary).not.toHaveBeenCalled();
  });
});
