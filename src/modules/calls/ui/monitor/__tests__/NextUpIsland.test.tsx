import { fireEvent, render, screen } from "@testing-library/react";

import { NextUpIsland } from "../NextUpIsland";
import type { MinutesOutlook } from "../monitor-copy";

const minutes = (overrides: Partial<MinutesOutlook> = {}): MinutesOutlook => ({
  usedMinutes: 246,
  limitMinutes: 300,
  remainingMinutes: 54,
  pct: 82,
  tone: "warning",
  outlook: null,
  ...overrides,
});

describe("NextUpIsland (premium F5)", () => {
  it("lo accionable: quién pidió que lo llamen, lo fallido y los minutos, con sus enlaces", () => {
    render(<NextUpIsland callbacks={{ total: 3, names: ["Andrés Pardo", "Marta Ruiz"] }} failed={2} minutes={minutes()} />);
    expect(screen.getByRole("heading", { name: "3 personas esperan tu llamada" })).toBeInTheDocument();
    expect(screen.getByText("Andrés Pardo, Marta Ruiz y 1 más")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver quién pidió" })).toHaveAttribute(
      "href",
      "/calls/history?outcome=callback_requested",
    );
    expect(screen.getByText("no se pudieron completar")).toBeInTheDocument();
    expect(screen.getByText("minutos te quedan del ciclo")).toBeInTheDocument();
  });

  it("sin pendientes y con minutos de sobra: «Todo al día», sin fila de minutos", () => {
    render(<NextUpIsland callbacks={{ total: 0, names: [] }} failed={0} minutes={minutes({ tone: "success", pct: 30 })} />);
    expect(screen.getByRole("heading", { name: "Todo al día" })).toBeInTheDocument();
    expect(screen.queryByText("minutos te quedan del ciclo")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver quién pidió" })).not.toBeInTheDocument();
  });

  it("si no pudo leer lo pendiente lo dice — jamás «Todo al día» sin haber mirado", () => {
    const onRetry = jest.fn();
    render(<NextUpIsland unavailable onRetry={onRetry} callbacks={null} failed={null} minutes={null} />);
    expect(screen.getByRole("heading", { name: "No pudimos revisar lo pendiente" })).toBeInTheDocument();
    expect(screen.queryByText("Todo al día")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("cargando: silueta, sin titular", () => {
    render(<NextUpIsland callbacks={null} failed={null} minutes={null} />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
