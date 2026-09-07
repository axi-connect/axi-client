import {
  accountFieldLabel,
  kindHasAccount,
  maskAccountNumber,
  PAYMENT_METHOD_KINDS,
} from "@/modules/payments/domain/payment-method";

describe("payment-method (dominio)", () => {
  it("efectivo y datáfono no llevan número de cuenta", () => {
    expect(kindHasAccount("cash")).toBe(false);
    expect(kindHasAccount("pos")).toBe(false);
    expect(kindHasAccount("nequi")).toBe(true);
    expect(accountFieldLabel("payment_link")).toBe("Enlace");
    expect(accountFieldLabel("bancolombia")).toBe("Número");
  });

  it("enmascara dejando los últimos 4; un enlace se muestra entero", () => {
    expect(maskAccountNumber("300 123 4567", "nequi")).toBe("•••• 4567");
    expect(maskAccountNumber("1234", "nequi")).toBe("1234");
    expect(maskAccountNumber(null, "nequi")).toBeNull();
    expect(maskAccountNumber("https://pay.example/abc", "payment_link")).toBe("https://pay.example/abc");
  });

  it("el selector cubre los 7 tipos del enum del backend", () => {
    expect([...PAYMENT_METHOD_KINDS].sort()).toEqual(
      ["bancolombia", "cash", "daviplata", "nequi", "other", "payment_link", "pos"],
    );
  });
});
