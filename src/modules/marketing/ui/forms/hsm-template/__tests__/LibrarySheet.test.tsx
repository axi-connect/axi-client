import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { HsmLibraryTemplateDTO } from "@/modules/marketing/domain/template-catalog";
import { LibrarySheet } from "../LibrarySheet";
import type { LibraryState } from "../use-hsm-template-draft";

/**
 * La hoja de la biblioteca de Meta (hsm-media F5): buscar, filtrar por caso de
 * uso y usar una. El filtro es de cliente; la carga y el error los trae el hook.
 */

const base: HsmLibraryTemplateDTO = {
  name: "auto_pay_reminder_1",
  language: "es",
  topic: "PAYMENTS",
  usecase: "AUTO_PAY_REMINDER",
  industries: ["FINANCIAL_SERVICES"],
  header: "Próximo pago automático",
  header_example: null,
  body: "Hola, {{1}}: tu pago automático de {{2}} está programado.",
  body_examples: ["John", "$12,34"],
  footer: null,
  buttons: [{ type: "url", text: "Ver cuenta", url: "https://www.example.com" }],
};
const ORDER: HsmLibraryTemplateDTO = {
  ...base,
  name: "delivery_update_1",
  topic: "ORDER_MANAGEMENT",
  usecase: "DELIVERY_UPDATE",
  header: null,
  body: "Tu pedido {{1}} ya va en camino. Llega el {{2}}.",
  body_examples: ["#4821", "jueves 9"],
  buttons: [],
};
const ITEMS = [base, ORDER];

function renderSheet(state: LibraryState = { kind: "ready", items: ITEMS }) {
  const props = { onOpenChange: jest.fn(), onRetry: jest.fn(), onUse: jest.fn() };
  render(<LibrarySheet open state={state} {...props} />);
  return props;
}

const cards = () => within(screen.getByRole("list", { name: "Plantillas de la biblioteca" })).getAllByRole("listitem");

describe("LibrarySheet", () => {
  it("enseña cada una con su caso de uso, los ejemplos resaltados y la aprobación inmediata", () => {
    renderSheet();

    expect(cards()).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Pedido en camino" })).toBeInTheDocument();
    expect(screen.getByText("#4821").tagName).toBe("MARK");
    expect(screen.getAllByText("Aprobación inmediata")).toHaveLength(2);
    expect(screen.getByText(/no trae plantillas de marketing/)).toBeInTheDocument();
  });

  it("buscar filtra por título, texto o caso de uso; sin resultados, lo dice con ideas", async () => {
    renderSheet();
    const search = screen.getByRole("searchbox", { name: "Buscar en la biblioteca de Meta" });

    // El campo espera a que se deje de teclear (300 ms) antes de filtrar.
    fireEvent.change(search, { target: { value: "camino" } });
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(screen.getByRole("button", { name: "Pedido en camino" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Próximo pago automático" })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "cita" } });
    expect(await screen.findByText("Nada con «cita». Prueba con pago, pedido o cita.")).toBeInTheDocument();
  });

  it("los casos de uso: «Todas» primero y solo los que hay", () => {
    renderSheet();
    const chips = within(screen.getByRole("group", { name: "Caso de uso" })).getAllByRole("button");

    expect(chips.map((chip) => chip.textContent)).toEqual(["Todas", "Pagos", "Pedidos y envíos"]);
    fireEvent.click(chips[2]);
    expect(chips[2]).toHaveAttribute("aria-pressed", "true");
    expect(cards()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Pedido en camino" })).toBeInTheDocument();
  });

  it("elegir una enseña «Usar esta plantilla», que la carga y cierra", () => {
    const props = renderSheet();
    expect(screen.queryByRole("button", { name: "Usar esta plantilla" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Próximo pago automático" }));
    expect(screen.getByRole("button", { name: "Próximo pago automático" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Usar esta plantilla" }));

    expect(props.onUse).toHaveBeenCalledWith(base);
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("si no llegó, dice por qué y deja reintentar", () => {
    const props = renderSheet({ kind: "error", message: "No pudimos traer la biblioteca de Meta" });

    expect(screen.getByText("No pudimos traer la biblioteca de Meta")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it("mientras carga, esqueletos y no una lista vacía", () => {
    renderSheet({ kind: "loading" });

    expect(screen.getByLabelText("Cargando la biblioteca")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText(/Nada con/)).not.toBeInTheDocument();
  });
});
