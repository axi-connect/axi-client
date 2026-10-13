import { fireEvent, render, screen } from "@testing-library/react";
import { useStorageStore } from "@/modules/storage/infrastructure/stores/storage.store";
import { StorageWarningNotice } from "../components/StorageWarningNotice";

const GIB = 1024 ** 3;

function seed(state: "ok" | "warning" | "full") {
  useStorageStore.setState({
    summary: {
      company_id: "c1",
      name: "Clínica",
      plan_name: "Crecimiento",
      used_bytes: 12.6 * GIB,
      quota_bytes: 15 * GIB,
      quota_source: "plan",
      grace_pct: 0,
      pct_used: 84,
      state,
      blocks_uploads: false,
      room_bytes: 2.4 * GIB,
      by_category: [],
      growth: { per_month_bytes: 0.8 * GIB, days_to_full: 90, series: [], window_days: 180 },
      measured_at: "2026-10-08T12:00:00.000Z",
    },
  } as never);
}

describe("StorageWarningNotice (aviso al 80 %)", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("al 80 % dice lo que queda y cuánto alcanza, con enlace al espacio", () => {
    seed("warning");
    render(<StorageWarningNotice />);
    expect(screen.getByRole("status")).toHaveTextContent("Te quedan 2,4 GB de espacio · a tu ritmo, unos 3 meses");
    expect(screen.getByRole("link", { name: "Ver espacio" })).toHaveAttribute("href", "/settings/company/almacenamiento");
  });

  it("una vez cerrado no vuelve en la sesión", () => {
    seed("warning");
    const { unmount } = render(<StorageWarningNotice />);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso de espacio" }));
    expect(screen.queryByRole("status")).toBeNull();
    unmount();
    render(<StorageWarningNotice />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("C-10: queda visto con solo mostrarse (no vuelve aunque no se cierre)", () => {
    seed("warning");
    const { unmount } = render(<StorageWarningNotice />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    unmount();
    render(<StorageWarningNotice />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("C-10: una sola línea — el texto se trunca, sin botón debajo", () => {
    seed("warning");
    render(<StorageWarningNotice />);
    const status = screen.getByRole("status");
    expect(status.className).toContain("h-11");
    expect(status.querySelector("p")?.className).toContain("truncate");
  });

  it("con espacio de sobra (o sin resumen) no dice nada", () => {
    seed("ok");
    render(<StorageWarningNotice />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
