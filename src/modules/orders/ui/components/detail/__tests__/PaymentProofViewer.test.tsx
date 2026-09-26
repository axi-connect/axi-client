import { render, screen, waitFor } from "@testing-library/react";

import type { OrderPaymentDTO } from "@/modules/orders/domain/order";

const mockProof = jest.fn<Promise<{ url: string }>, [string, string]>();
jest.mock(
  "@/modules/orders/infrastructure/services/order-payments-service.adapter",
  () => ({
    getPaymentProofUrl: (orderId: string, paymentId: string) =>
      mockProof(orderId, paymentId),
  }),
);

import { PaymentProofViewer } from "@/modules/orders/ui/components/detail/PaymentProofViewer";

const payment = (attachment_id: string | null): OrderPaymentDTO =>
  ({
    id: "pay-1",
    attachment_id,
    mime_type: "image/png",
  }) as unknown as OrderPaymentDTO;

describe("PaymentProofViewer (QA R6: el 422 repetido de GET /attachment)", () => {
  beforeEach(() =>
    mockProof
      .mockReset()
      .mockResolvedValue({ url: "https://s3.test/proof.png" }),
  );

  it("un pago SIN comprobante no pide la URL firmada ni pinta nada", () => {
    const { container } = render(
      <PaymentProofViewer orderId="o1" payment={payment(null)} />,
    );
    expect(mockProof).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("un pago CON comprobante sí la pide y muestra la imagen", async () => {
    render(<PaymentProofViewer orderId="o1" payment={payment("att-1")} />);
    expect(mockProof).toHaveBeenCalledWith("o1", "pay-1");
    await waitFor(() =>
      expect(screen.getByAltText("Comprobante de pago")).toHaveAttribute(
        "src",
        "https://s3.test/proof.png",
      ),
    );
  });
});
