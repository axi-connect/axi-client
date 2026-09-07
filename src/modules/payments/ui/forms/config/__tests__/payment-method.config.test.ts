import type { PaymentMethodDTO } from "@/modules/payments/domain/payment-method";
import {
  paymentMethodFormSchema,
  toCreatePaymentMethodDTO,
  toUpdatePaymentMethodDTO,
} from "@/modules/payments/ui/forms/config/payment-method.config";

const ORIGINAL: PaymentMethodDTO = {
  id: "pm-1",
  kind: "nequi",
  label: "Nequi principal",
  account_holder: "Tienda SAS",
  account_number: "3001234567",
  instructions: null,
  is_active: true,
  visible_to_ai: true,
  position: 0,
  created_at: "2026-09-01T10:00:00.000Z",
  updated_at: "2026-09-01T10:00:00.000Z",
};

describe("payment-method.config", () => {
  it("el nombre es obligatorio y respeta el tope del backend (80)", () => {
    expect(paymentMethodFormSchema.safeParse({ kind: "nequi", label: "", is_active: true, visible_to_ai: true }).success).toBe(false);
    expect(paymentMethodFormSchema.safeParse({ kind: "nequi", label: "a".repeat(81), is_active: true, visible_to_ai: true }).success).toBe(false);
  });

  it("crear: los vacíos no viajan y un tipo sin cuenta descarta titular y número", () => {
    expect(
      toCreatePaymentMethodDTO({
        kind: "cash",
        label: "Efectivo",
        account_holder: "alguien",
        account_number: "123",
        instructions: "",
        is_active: true,
        visible_to_ai: false,
      }),
    ).toEqual({ kind: "cash", label: "Efectivo", is_active: true, visible_to_ai: false });
  });

  it("editar: vaciar un valor que existía manda null (BORRA); vaciar uno que ya era null se omite", () => {
    const dto = toUpdatePaymentMethodDTO(
      { ...ORIGINAL, account_holder: "", account_number: "3009999999", instructions: "" },
      ORIGINAL,
    );
    expect(dto).toEqual({
      kind: "nequi",
      label: "Nequi principal",
      is_active: true,
      visible_to_ai: true,
      account_holder: null,
      account_number: "3009999999",
    });
    expect(dto).not.toHaveProperty("instructions");
  });

  it("editar: cambiar a efectivo borra titular y número aunque el formulario los conserve", () => {
    const dto = toUpdatePaymentMethodDTO(
      { ...ORIGINAL, kind: "cash", account_holder: "Tienda SAS", account_number: "3001234567", instructions: "" },
      ORIGINAL,
    );
    expect(dto).toMatchObject({ kind: "cash", account_holder: null, account_number: null });
  });
});
