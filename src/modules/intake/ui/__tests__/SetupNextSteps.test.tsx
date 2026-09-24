import { render, screen, within } from "@testing-library/react";

import type { IntakeSummary } from "@/modules/intake/domain/intake";
import { SetupNextSteps } from "../components/SetupNextSteps";
import { SetupDone } from "../components/SetupStates";

/**
 * Lo que sustituye a «queda configurada de punta a punta»: tres listas con la
 * verdad. El copy viene del servidor; aquí se prueba que se pinta lo que llega,
 * en el orden acordado, y que un grupo vacío no ocupa sitio.
 */
const FULL: IntakeSummary = {
  axi_applies: 14,
  applied: false,
  you_do: [
    { label: "Cómo saludan", value: "¡Hola! Bienvenida a Savage", where: "Ajustes › Agente › Guion de ventas" },
  ],
  to_activate: [
    { step: "whatsapp", label: "Conectar tu WhatsApp", where: "Canales" },
    { step: "catalog", label: "Subir tus productos", where: "Catálogo" },
  ],
};

describe("SetupNextSteps", () => {
  it("pinta los tres grupos, en orden, con el valor y el dónde de cada fila", () => {
    render(<SetupNextSteps summary={FULL} />);
    const groups = screen.getAllByRole("region").map((region) => region.getAttribute("aria-label"));
    expect(groups).toEqual(["Lo deja aplicado axi", "Lo pones tú", "Para que atienda de verdad"]);

    expect(screen.getByText("14 datos de tu negocio")).toBeInTheDocument();
    expect(screen.getByText(/El equipo de axi los revisa/)).toBeInTheDocument();

    const you = screen.getByRole("region", { name: "Lo pones tú" });
    expect(within(you).getByText("Cómo saludan")).toBeInTheDocument();
    expect(within(you).getByText("¡Hola! Bienvenida a Savage")).toBeInTheDocument();
    expect(within(you).getByText("Ajustes › Agente › Guion de ventas")).toBeInTheDocument();

    const act = screen.getByRole("region", { name: "Para que atienda de verdad" });
    expect(within(act).getByText("Conectar tu WhatsApp")).toBeInTheDocument();
    expect(within(act).getByText("Canales")).toBeInTheDocument();
    // Sin botones: la persona no tiene sesión en el panel; el «dónde» orienta.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("ya aplicada cambia el primer grupo: lo que está en la cuenta, en singular si es uno", () => {
    render(<SetupNextSteps summary={{ ...FULL, applied: true, axi_applies: 1 }} />);
    expect(screen.getByRole("region", { name: "Ya está en tu cuenta" })).toBeInTheDocument();
    expect(screen.getByText("1 dato aplicado")).toBeInTheDocument();
  });

  it("un grupo vacío no se pinta; sin nada que decir, no ocupa sitio", () => {
    render(<SetupNextSteps summary={{ axi_applies: 3, applied: false, you_do: [], to_activate: [] }} />);
    expect(screen.getAllByRole("region")).toHaveLength(1);
    const { container } = render(
      <SetupNextSteps summary={{ axi_applies: 0, applied: false, you_do: [], to_activate: [] }} />,
    );
    expect(container.querySelector("[data-testid='next-steps']")).toBeNull();
  });

  it("con la meta del mes: su grupo va ANTES de «Lo pones tú», con lo que implica y el antes", () => {
    render(
      <SetupNextSteps
        summary={{
          ...FULL,
          goal: {
            target_cents: 3_000_000_000,
            currency: "COP",
            month_label: "octubre",
            needed_sales: 43,
            avg_ticket_cents: 70_000_000,
            last_month_revenue_cents: 2_200_000_000,
            delta_pct: 36,
          },
        }}
      />,
    );
    const groups = screen.getAllByRole("region").map((region) => region.getAttribute("aria-label"));
    expect(groups).toEqual(["Lo deja aplicado axi", "Tu meta del mes", "Lo pones tú", "Para que atienda de verdad"]);
    const goal = screen.getByRole("region", { name: "Tu meta del mes" });
    expect(within(goal).getByText("Tu meta de octubre")).toBeInTheDocument();
    expect(within(goal).getByText("$ 30 M")).toBeInTheDocument();
    expect(within(goal).getByText(/^43 · ticket \$\s700\.000$/)).toBeInTheDocument();
    expect(within(goal).getByText("$ 22 M el mes pasado · +36 %")).toBeInTheDocument();
  });

  it("sin meta (null o un servidor sin el campo) no hay grupo; sin ticket ni mes pasado, solo la meta", () => {
    const { rerender } = render(<SetupNextSteps summary={{ ...FULL, goal: null }} />);
    expect(screen.queryByRole("region", { name: "Tu meta del mes" })).toBeNull();
    rerender(<SetupNextSteps summary={FULL} />);
    expect(screen.queryByRole("region", { name: "Tu meta del mes" })).toBeNull();
    rerender(
      <SetupNextSteps
        summary={{
          ...FULL,
          goal: {
            target_cents: 1_800_000_000,
            currency: "COP",
            month_label: "octubre",
            needed_sales: null,
            avg_ticket_cents: null,
            last_month_revenue_cents: 2_000_000_000,
            delta_pct: -10,
          },
        }}
      />,
    );
    const goal = screen.getByRole("region", { name: "Tu meta del mes" });
    expect(within(goal).queryByText("Ventas necesarias")).toBeNull();
    // Una meta por debajo del mes pasado no se dice como «−10 %».
    expect(within(goal).getByText("$ 20 M el mes pasado")).toBeInTheDocument();
  });

  it("SetupDone lo enseña bajo el cierre y sigue sin él cuando la sesión no lo trae", () => {
    const { rerender } = render(
      <SetupDone closing="Listo." summary={FULL} companyName="Savage" assistantName="Alba" onReview={jest.fn()} />,
    );
    expect(screen.getByText("Listo.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Lo pones tú" })).toBeInTheDocument();
    rerender(
      <SetupDone closing="Listo." summary={null} companyName="Savage" assistantName="Alba" onReview={jest.fn()} />,
    );
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revisar lo que anoté" })).toBeInTheDocument();
  });
});
