import { fireEvent, render, screen } from "@testing-library/react";

import type { OrderNotificationSettingsDTO } from "@/modules/orders/domain/order";

const tpl = (body: string, enabled = true) => ({ enabled, body });
const settings: OrderNotificationSettingsDTO = {
  templates: {
    confirmed: tpl("Hola {{contact_name}}, confirmamos {{order_number}}."),
    paid: tpl("Pagado {{order_number}}."),
    payment_received: tpl(
      "Hola {{contact_name}}, recibimos {{amount}}. Te falta {{balance}}.",
    ),
    fulfilled: tpl("Entregado.", false),
    cancelled: tpl("Cancelado.", false),
    payment_rejected: tpl("Rechazado."),
  },
} as unknown as OrderNotificationSettingsDTO;

jest.mock(
  "@/modules/orders/infrastructure/services/order-settings-service.adapter",
  () => ({
    getOrderNotificationSettings: () => Promise.resolve(settings),
    updateOrderNotificationSettings: jest.fn(),
  }),
);
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

import {
  OrderNotificationTemplatesForm,
  previewBody,
} from "@/modules/orders/ui/forms/OrderNotificationTemplatesForm";

describe("Avisos del pedido · premium P3", () => {
  it("previewBody rellena solo las variables conocidas; una desconocida queda tal cual", () => {
    expect(
      previewBody("Hola {{contact_name}}, falta {{balance}} {{otra}}"),
    ).toBe("Hola Ana, falta $ 14.458.586 {{otra}}");
  });

  it("abre en el aviso del abono, con su vista previa, y marca sus variables propias", async () => {
    render(<OrderNotificationTemplatesForm />);
    const island = await screen.findByRole("region", { name: "Así le llega" });
    expect(island).toHaveTextContent(
      "Hola Ana, recibimos $ 5.000.000. Te falta $ 14.458.586.",
    );
    expect(screen.getByText(/Solo aquí se resuelven/)).toBeInTheDocument();
  });

  it("elegir otro aviso cambia el editor; uno apagado lo dice en vez de previsualizar", async () => {
    render(<OrderNotificationTemplatesForm />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Pedido entregado" }),
    );
    expect(
      screen.getByRole("region", { name: "Así le llega" }),
    ).toHaveTextContent("Este aviso está apagado");
    expect(screen.queryByText(/Solo aquí se resuelven/)).toBeNull();
  });

  it("insertar una variable la agrega al texto del aviso elegido", async () => {
    render(<OrderNotificationTemplatesForm />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Pedido confirmado" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "{{total}}" }));
    expect(screen.getByLabelText("Pedido confirmado")).toHaveValue(
      "Hola {{contact_name}}, confirmamos {{order_number}}. {{total}}",
    );
  });
});
