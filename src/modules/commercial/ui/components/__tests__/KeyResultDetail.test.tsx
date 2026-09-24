import { render, screen, within } from "@testing-library/react";

import { resetCommercialStore, useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { KeyResultDetail, KeyResultDetailFooter } from "../KeyResultDetail";
import { learningPace, pace, plan, proposal } from "../../__tests__/fixtures";

beforeEach(() => {
  resetCommercialStore();
});

// recharts no se prueba aquí: la serie acumulada la fija `key-result.test.ts`.
jest.mock("@/shared/components/features/charts/AreaTrend", () => ({ AreaTrend: () => null }));

describe("KeyResultDetail", () => {
  it("ventas: cifra grande con badge, tendencia acumulada, el camino y la proyección", () => {
    render(<KeyResultDetail detailKey="sales" pace={pace} plan={plan} canManage />);
    expect(screen.getByText("27")).toBeInTheDocument();
    expect(screen.getByText("de 43 · faltan 16")).toBeInTheDocument();
    expect(screen.getByText("Ritmo bajo")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ventas acumuladas del mes: 27 reales frente a 33 esperadas a hoy" })).toBeInTheDocument();
    const path = screen.getByRole("region", { name: "El camino" });
    expect(within(path).getByText("27 ventas · 63 %")).toBeInTheDocument();
    expect(within(path).getByText("43 × 20 de 26 días hábiles")).toBeInTheDocument();
    expect(within(path).getByText("2,7 al día · 6 días hábiles")).toBeInTheDocument();
    expect(within(path).getByText("35 ventas · 81 %")).toBeInTheDocument();
  });

  it("«De dónde sale» con procedencia y «Corregir» → /comercial/meta solo a quien puede", () => {
    const { rerender } = render(<KeyResultDetail detailKey="sales" pace={pace} plan={plan} canManage />);
    const sources = screen.getByRole("region", { name: "De dónde sale" });
    expect(within(sources).getByText("Cotización → venta")).toBeInTheDocument();
    expect(within(sources).getByText("38 %")).toBeInTheDocument();
    expect(within(sources).getAllByText("según tu historia").length).toBeGreaterThan(0);
    expect(within(sources).getByRole("link", { name: "Corregir Ticket promedio" })).toHaveAttribute("href", "/comercial/meta");
    rerender(<KeyResultDetail detailKey="sales" pace={pace} plan={plan} canManage={false} />);
    expect(screen.queryByRole("link", { name: /Corregir/ })).toBeNull();
  });

  it("el mix sugerido va SOLO en ventas", () => {
    const { rerender } = render(<KeyResultDetail detailKey="sales" pace={pace} plan={plan} canManage />);
    expect(screen.getByRole("region", { name: "Mix sugerido" })).toHaveTextContent("Limpieza facial");
    rerender(<KeyResultDetail detailKey="quotes" pace={pace} plan={plan} canManage />);
    expect(screen.queryByRole("region", { name: "Mix sugerido" })).toBeNull();
    // Sin serie propia: la tendencia es solo de ventas.
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("llamadas: las contestadas en la línea secundaria del recorrido", () => {
    render(<KeyResultDetail detailKey="calls" pace={pace} plan={plan} canManage />);
    expect(within(screen.getByRole("region", { name: "El camino" })).getByText("Contestadas 79 de 120")).toBeInTheDocument();
  });

  it("aprendiendo: sin ritmo, sin proyección y sin tendencia", () => {
    render(<KeyResultDetail detailKey="sales" pace={learningPace} plan={plan} canManage />);
    expect(screen.queryByText("Ritmo bajo")).toBeNull();
    expect(screen.queryByText("Proyección al cierre")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("un resultado fuera de la ruta del mes lo dice; el pie enlaza por href", () => {
    render(<KeyResultDetail detailKey="meetings" pace={pace} plan={plan} canManage />);
    expect(screen.getByText("Este resultado no está en tu ruta de este mes.")).toBeInTheDocument();
    render(<KeyResultDetailFooter detailKey="sales" />);
    expect(screen.getByRole("link", { name: /Ver en el CRM/ })).toHaveAttribute("href", "/crm/pipeline");
  });

  it("no esconde el excedente: ticket y proyección por encima del plan dicen más de 100 % (C10)", () => {
    const ahead = {
      ...pace,
      avg_ticket_actual_cents: 92_400_000,
      key_results: [{ ...pace.key_results[0], actual: 40, target: 30, expected: 23 }],
    };
    const { rerender } = render(<KeyResultDetail detailKey="sales" pace={ahead} plan={plan} canManage />);
    const path = screen.getByRole("region", { name: "El camino" });
    expect(within(path).getByText("40 ventas · 133 %")).toBeInTheDocument();
    // 40 ÷ 20 × 26 = 52 → 173 % de 30.
    expect(within(path).getByText("52 ventas · 173 %")).toBeInTheDocument();
    rerender(<KeyResultDetail detailKey="avg_ticket" pace={ahead} plan={plan} canManage />);
    expect(screen.getByText("132 %")).toBeInTheDocument();
  });

  it("el pie cuenta las acciones pendientes que empujan ESTE resultado (C11)", () => {
    useCommercialStore.setState({
      proposals: {
        status: "ready",
        error: null,
        data: [
          proposal,
          { ...proposal, id: "p2" },
          { ...proposal, id: "p3", status: "approved" },
          { ...proposal, id: "p4", target_key_result: "quotes" },
        ],
      },
    });
    const { rerender } = render(<KeyResultDetailFooter detailKey="sales" />);
    expect(screen.getByText("2 acciones propuestas empujan este resultado")).toBeInTheDocument();
    rerender(<KeyResultDetailFooter detailKey="quotes" />);
    expect(screen.getByText("1 acción propuesta empuja este resultado")).toBeInTheDocument();
    rerender(<KeyResultDetailFooter detailKey="calls" />);
    expect(screen.queryByText(/empuja/)).toBeNull();
  });
});
