import { act, fireEvent, render, screen } from "@testing-library/react";

import { HttpError } from "@/core/api/problem";
import { CallLauncherDialog } from "../CallLauncherDialog";

const launchCall = jest.fn();
const placeTestCall = jest.fn();
jest.mock("@/modules/calls/infrastructure/services/calls-service.adapter", () => ({
  launchCall: (...args: unknown[]) => launchCall(...args),
  placeTestCall: (...args: unknown[]) => placeTestCall(...args),
}));
jest.mock("@/modules/agents/public", () => ({ getTenantAgents: () => Promise.resolve([]) }));
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }));

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

const CONTACT = { kind: "contact" as const, contact_id: "c1", name: "Diana Salazar", phone: "+573001234567" };

describe("CallLauncherDialog (plan de modos §7)", () => {
  beforeEach(() => {
    launchCall.mockReset();
    placeTestCall.mockReset();
  });

  it("a un contacto: lanza con su tipo, modo proactivo y una clave de idempotencia estable", async () => {
    launchCall.mockResolvedValue({ call_session_id: "s1" });
    const onOpenChange = jest.fn();
    render(
      <CallLauncherDialog open onOpenChange={onOpenChange} target={CONTACT} defaultType="collections" defaultObjective="Cuota vencida" />,
    );
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Llamar" }));
    await flush();
    const [body, key] = launchCall.mock.calls[0] as [Record<string, unknown>, string];
    expect(body).toMatchObject({ contact_id: "c1", call_type: "collections", mode: "proactive", objective: "Cuota vencida" });
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(10);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("si el contacto ya está al teléfono, lo dice en palabras y no cierra", async () => {
    launchCall.mockRejectedValue(
      new HttpError({
        status: 409,
        code: "calls/launch_skipped",
        message: "No se pudo hacer la llamada ahora",
        problem: {
          type: "about:blank",
          title: "No se pudo hacer la llamada ahora",
          status: 409,
          code: "calls/launch_skipped",
          details: { reason: "already_in_call" },
        } as never,
      }),
    );
    const onOpenChange = jest.fn();
    render(<CallLauncherDialog open onOpenChange={onOpenChange} target={CONTACT} />);
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Llamar" }));
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent("ya está al teléfono");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("desde el Monitoreo (número): pide el número y va por la llamada de prueba", async () => {
    placeTestCall.mockResolvedValue({ call_session_id: "s2" });
    render(<CallLauncherDialog open onOpenChange={jest.fn()} target={{ kind: "number" }} />);
    await flush();
    const call = screen.getByRole("button", { name: "Llamar" });
    expect(call).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Número de destino"), { target: { value: "+57 300 123 4567" } });
    fireEvent.click(screen.getByRole("radio", { name: /Reactivo/ }));
    fireEvent.click(call);
    await flush();
    expect(placeTestCall).toHaveBeenCalledWith(expect.objectContaining({ to: "+57 300 123 4567", mode: "reactive" }));
    expect(launchCall).not.toHaveBeenCalled();
  });

  it("M4: un contacto sin teléfono no deja llamar y lo dice antes", async () => {
    render(<CallLauncherDialog open onOpenChange={jest.fn()} target={{ ...CONTACT, phone: null }} />);
    await flush();
    expect(screen.getByRole("button", { name: "Llamar" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("no tiene un teléfono");
  });

  it("B1: las flechas mueven el modo (un solo tabulador en el grupo)", async () => {
    render(<CallLauncherDialog open onOpenChange={jest.fn()} target={CONTACT} />);
    await flush();
    const proactive = screen.getByRole("radio", { name: /Proactivo/ });
    const reactive = screen.getByRole("radio", { name: /Reactivo/ });
    expect(proactive).toHaveAttribute("tabindex", "0");
    expect(reactive).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(proactive, { key: "ArrowRight" });
    expect(reactive).toHaveAttribute("aria-checked", "true");
  });

  it("B5: cambiar un campo es otro pedido (otra clave); repetir el mismo, la misma", async () => {
    launchCall.mockRejectedValue(new Error("red"));
    render(<CallLauncherDialog open onOpenChange={jest.fn()} target={CONTACT} />);
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Llamar" }));
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Llamar" }));
    await flush();
    fireEvent.click(screen.getByRole("radio", { name: /Reactivo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Llamar" }));
    await flush();
    const keys = launchCall.mock.calls.map((c) => (c as [unknown, string])[1]);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  describe("«Llamar para cobrar» (F3)", () => {
    const PLAN = {
      plan_id: "p1",
      order_number: 1042,
      currency: "COP",
      balance_cents: 15_000_000,
      overdue_cents: 5_000_000,
      days_overdue: 5,
      next_due_at: "2026-09-25",
      promised_at: null,
    };

    it("tipo fijo en Cobranza, lo que sabe el agente y el plan viaja al lanzar", async () => {
      launchCall.mockResolvedValue({ call_session_id: "s1" });
      render(
        <CallLauncherDialog open onOpenChange={jest.fn()} target={{ ...CONTACT, name: "Laura Gómez" }} collections={PLAN} />,
      );
      await flush();
      expect(screen.getByText("Fijo: la llamada cobra el pedido #1042.")).toBeInTheDocument();
      const knows = screen.getByRole("region", { name: "Lo que sabe tu agente" });
      expect(knows).toHaveTextContent("Saldo del pedido #1042");
      expect(knows).toHaveTextContent("hace 5 días");
      expect(knows).toHaveTextContent("Ninguna viva");
      expect(knows).toHaveTextContent("Si Laura lo pide o lo acepta");

      fireEvent.click(screen.getByRole("button", { name: "Llamar" }));
      await flush();
      expect(launchCall.mock.calls[0]?.[0]).toMatchObject({
        contact_id: "c1",
        call_type: "collections",
        plan_id: "p1",
      });
    });

    it("con una promesa viva, el agente la recuerda y no anota otra", async () => {
      render(
        <CallLauncherDialog open onOpenChange={jest.fn()} target={CONTACT} collections={{ ...PLAN, promised_at: "2026-10-02" }} />,
      );
      await flush();
      const knows = screen.getByRole("region", { name: "Lo que sabe tu agente" });
      expect(knows).toHaveTextContent("Prometió pagar el");
      expect(knows).toHaveTextContent("no anota otra");
    });

    it("sin plan no hay bloque ni plan_id", async () => {
      launchCall.mockResolvedValue({ call_session_id: "s1" });
      render(<CallLauncherDialog open onOpenChange={jest.fn()} target={CONTACT} />);
      await flush();
      expect(screen.queryByRole("region", { name: "Lo que sabe tu agente" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Llamar" }));
      await flush();
      expect(launchCall.mock.calls[0]?.[0]).not.toHaveProperty("plan_id");
    });
  });
});

