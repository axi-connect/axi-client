import { HttpError } from "@/core/api/problem";
import { errorMessage } from "../error-messages";

const problem = (code: string, detail: string) =>
  new HttpError({ status: 422, code, message: detail, problem: { type: "about:blank", title: "x", status: 422, code, detail } });

describe("errorMessage · dos salidas en un pedido (Cobros premium P2)", () => {
  it("el 422 de fechas mezcladas se dice en español y con qué hacer", () => {
    expect(errorMessage(problem("orders/mixed_service_dates", "Items con fechas de servicio distintas"))).toBe(
      "Son dos salidas distintas: un pedido lleva una sola fecha del servicio. Arma otro pedido para la otra salida",
    );
  });

  it("otro código del slice de pedidos no toma ese texto", () => {
    expect(errorMessage(problem("orders/empty_order", "vacío"))).toBe("El pedido no tiene productos");
  });
});
