import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { HttpError } from "@/core/api/problem";
import { expectAlertContract } from "@/core/notifications/testing";
import type { OrderNotificationSettingsDTO } from "@/modules/orders/domain/order";

const mockGet = jest.fn<Promise<OrderNotificationSettingsDTO>, []>();
const mockUpdate = jest.fn<Promise<OrderNotificationSettingsDTO>, [unknown]>();
jest.mock("@/modules/orders/infrastructure/services/order-settings-service.adapter", () => ({
  getOrderNotificationSettings: () => mockGet(),
  updateOrderNotificationSettings: (dto: unknown) => mockUpdate(dto),
}));
const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: mockShowAlert }) }));

import { OrderNotificationTemplatesForm } from "@/modules/orders/ui/forms/OrderNotificationTemplatesForm";

const template = (body: string) => ({ enabled: true, body });
const settings = {
  templates: {
    confirmed: template("Confirmado {{order_number}}"),
    paid: template("Pagado"),
    fulfilled: template("Entregado"),
    cancelled: template("Cancelado"),
    payment_rejected: template("Rechazado"),
    payment_received: template("Recibido {{amount}}"),
    checkout_link: template("Link"),
  },
} as unknown as OrderNotificationSettingsDTO;

const failure = (detail: string) =>
  new HttpError({
    status: 500,
    code: "orders/qa_probe",
    message: detail,
    problem: { type: "about:blank", title: "Error", status: 500, code: "orders/qa_probe", detail },
  });

describe("OrderNotificationTemplatesForm · avisos (§9.4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("un fallo al cargar es un estado de la vista: Alert en línea con «Reintentar», no un aviso", async () => {
    mockGet.mockRejectedValueOnce(failure("Se cayó el servicio"));
    mockGet.mockResolvedValueOnce(settings);
    render(<OrderNotificationTemplatesForm />);

    const alert = await screen.findByText("No se pudieron cargar las plantillas");
    expect(alert.closest('[role="alert"], [data-slot="alert"]')).not.toBeNull();
    expect(screen.getByText(/Se cayó el servicio/)).toBeInTheDocument();
    expect(mockShowAlert).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Notificaciones de pedidos" })).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it("guardar: el título cabe en la píldora y el mensaje del servidor va al cuerpo", async () => {
    mockGet.mockResolvedValue(settings);
    mockUpdate.mockRejectedValueOnce(failure("Plantilla demasiado larga"));
    render(<OrderNotificationTemplatesForm />);
    await screen.findByRole("heading", { name: "Notificaciones de pedidos" });

    fireEvent.click(screen.getByRole("button", { name: /Guardar/ }));
    await waitFor(() => expect(mockShowAlert).toHaveBeenCalledTimes(1));
    const alert = mockShowAlert.mock.calls[0]?.[0] as { title: string; description: string };
    expect(alert.title).toBe("No se pudieron guardar");
    expect(alert.description).toBe("Las plantillas siguen como estaban. Plantilla demasiado larga");
    expectAlertContract(alert, { serverMessage: "Plantilla demasiado larga" });
    // El título de antes tenía 37 caracteres: no pasa
    expect(() =>
      expectAlertContract({ tone: "error", title: "No se pudieron guardar las plantillas" }),
    ).toThrow(/título de 37/);

    mockUpdate.mockResolvedValueOnce(settings);
    fireEvent.click(screen.getByRole("button", { name: /Guardar/ }));
    await waitFor(() => expect(mockShowAlert).toHaveBeenCalledTimes(2));
    expect(mockShowAlert.mock.calls[1]?.[0]).toEqual({ tone: "success", title: "Plantillas guardadas" });
    expectAlertContract(mockShowAlert.mock.calls[1]?.[0]);
  });
});
